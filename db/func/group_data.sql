-- creates a new, uncommited change.
-- raises bad-login-credentials on error.
-- on success, returns the change id.
create or replace function create_change(
    token uuid,
    group_id integer,
    message text default '',
    out change_id integer
)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth_group.user_id into locals.usr
    from session_auth_group(create_change.token, create_change.group_id, need_write_permission := true);

    insert into change (grp, usr, message)
    values (create_change.group_id, locals.usr, create_change.message)
    returning change.id into create_change.change_id;
end;
$$ language plpgsql;
call allow_function('create_change');


-- validates an existing login session token,
-- and returns the usr.id of the user this authenticates as
-- as well as the group id of the change.
--
-- also checks that the user is allowed to modify the given change.
--
-- designed for internal use by all functions that accept a session authtoken,
-- and want to modify a change.
--
-- methods that call this can raise:
--
-- - bad-authtoken
-- - no-change-ownership
-- - change-already-commited
create or replace function session_auth_change(
    token uuid,
    change_id bigint,
    out user_id integer,
    out group_id integer
)
as $$
<<locals>>
declare
    commited timestamptz;
begin
    select session_auth(session_auth_change.token) into session_auth_change.user_id;

    select
        change.commited,
        change.grp
    into
        locals.commited,
        session_auth_change.group_id
    from
        change
    where
        change.id = change_id and
        change.usr = session_auth_change;

    if not found then
        raise exception 'no-change-ownership:user does not own this change';
    end if;

    if commited is not null then
        raise exception 'change-already-commited:change has already been commited';
    end if;
end;
$$ language plpgsql;


-- sets the message of a change
create or replace procedure set_change_message(
    token uuid,
    change_id integer,
    message text
)
as $$
begin
    select from session_auth_change(set_change_message.token, set_change_message.change_id);

    update change set change.message = set_change_message.message
    where change.id = set_change_message.change_id;
end;
$$ language plpgsql;
call allow_function('set_change_message');


-- returns all uncomited changes of a group
-- if only_mine is set to True, only the user's changes are returned
create or replace function get_uncommited_changes(
    token uuid,
    group_id integer,
    only_mine boolean
)
returns table (
    change_id bigint,
    user_id integer,
    started timestamptz,
    message text
)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth_group.user_id into locals.usr
    from session_auth_group(get_uncommited_changes.token, get_uncommited_changes.group_id);

    return query
    select
        change.id as change_id,
        change.usr as user_id,
        change.started as started,
        change.message as message
    from
        change
    where
        change.grp = get_uncommited_changes.group_id and
        (change.usr = locals.usr or not get_uncommited_changes.only_mine);
end;
$$ language plpgsql;
call allow_function('get_uncommited_changes');


-- commits a change.
-- this is only allowed if the group evaluation with this change does not
-- reveal any inconsistencies.
--
-- can raise any of the errors from session_auth_group or session_auth_change,
-- or group-data-inconsistent
create or replace procedure commit_change(
    token uuid,
    change_id integer
)
as $$
<<locals>>
declare
    usr integer;
    grp integer;
begin
    -- ensure that the user is authorized to write this change
    select session_auth_change.user_id, session_auth_change.group_id
    into locals.usr, locals.grp
    from session_auth_change(commit_change.token, commit_change.change_id);

    -- ensure that the user is authorized to write the group
    select from session_auth_group(commit_change.token, locals.grp);

    -- ensure that the group has no inconsistencies during evaluation with this change.
    -- TODO attempt to evaluate in the context of this user and check the consistency flag

    -- set the change as commited
    update change set commited = now() where change.id = commit_change.change_id;
    -- add a log entry for the commit
    insert into group_log (grp, usr, type, message)
    values (locals.grp, locals.usr, 'commit-change', concat('commited change #', commit_change.change_id));
end;
$$ language plpgsql;
call allow_function('commit_change');


-- discards a change.
--
-- can raise any of the errors from session_auth_change.
create or replace procedure discard_change(
    token uuid,
    change_id integer
)
as $$
begin
    -- ensure that the user is authorized to write this change
    select from session_auth_change(discard_change.token, discard_change.change_id);

    -- get rid of the change
    delete from change where change.id = discard_change.change_id;
end;
$$ language plpgsql;
call allow_function('discard_change');

-- retrieves the accounts in a group
create or replace function account_list(
    authtoken uuid,
    group_id integer
)
returns table (
    account_id integer,
    last_change_id bigint,
    valid bool,
    name text,
    description text,
    priority integer
)
as $$
<<locals>>
    declare
    usr integer;
begin
    select session_auth_group.user_id into locals.usr
    from session_auth_group(account_list.authtoken, account_list.group_id);

    return query
        select
            account_history.id as account_id,
            account_history.change as last_change_id,
            account_history.valid as valid,
            account_history.name as name,
            account_history.description as description,
            account_history.priority as priority
        from
            account_history
            join account on account_history.id = account.id
        where
            account.grp = account_list.group_id;
end;
$$ language plpgsql;
call allow_function('account_list');

-- creates a new account in a group
create or replace function account_create(
    authtoken uuid,
    group_id integer,
    name text,
    description text,
    priority integer default 0,
    out account_id integer,
    out change_id bigint
)
as $$
<<locals>>
    declare
    usr integer;
begin
    select session_auth_group.user_id into locals.usr
    from session_auth_group(account_create.authtoken, account_create.group_id, true);

    insert into account (grp)
    values (account_create.group_id) returning account.id into account_create.account_id;

    insert into change (grp, usr, message, commited)
    values (account_create.group_id, locals.usr, 'create account', now())
    returning change.id into account_create.change_id;

    insert into account_history(id, change, name, description, priority)
    values (account_create.account_id, account_create.change_id, account_create.name, account_create.description, account_create.priority);
end;
$$ language plpgsql;
call allow_function('account_create');

-- retrieves all transactions in a group
create or replace function transaction_list(
    authtoken uuid,
    group_id integer
)
returns table (
    transaction_id integer,
    last_change_id bigint,
    type text,
    valid bool,
    currency_symbol text,
    currency_conversion_rate double precision,
    value double precision,
    description text
)
as $$
<<locals>>
    declare
    usr integer;
begin
    select session_auth_group.user_id into locals.usr
    from session_auth_group(transaction_list.authtoken, transaction_list.group_id);

    return query
        select
            transaction.id as transaction_id,
            transaction_history.change as last_change_id,
            transaction.type::text as type,
            transaction_history.valid as valid,
            transaction_history.currency_symbol as currency_symbol,
            transaction_history.currency_conversion_rate as currency_conversion_rate,
            transaction_history.value as value,
            transaction_history.description as description
        from
            transaction
        join transaction_history on transaction.id = transaction_history.id
        where
            transaction.grp = transaction_list.group_id;
end;
$$ language plpgsql;
call allow_function('transaction_list');

-- posts a chat message to the group log
create or replace function transaction_create(
    authtoken uuid,
    group_id integer,
    type text,
    description text,
    currency_symbol text,
    currency_conversion_rate double precision,
    value double precision,
    out transaction_id integer,
    out change_id bigint
)
as $$
<<locals>>
    declare
    usr integer;
begin
    select session_auth_group.user_id into locals.usr
    from session_auth_group(account_create.authtoken, account_create.group_id, true);

    insert into transaction(grp, type)
    values (transaction_create.group_id, transaction_create.type)
    returning transaction.id into transaction_create.transaction_id;

    insert into change (grp, usr, message)
    values (transaction_create.group_id, locals.usr, 'WIP: transaction')
    returning change.id into transaction_create.change_id;

    insert into transaction_history(id, change, currency_symbol, currency_conversion_rate, value, description)
    values (
        transaction_create.transaction_id,
        transaction_create.change_id,
        transaction_create.currency_symbol,
        transaction_create.currency_conversion_rate,
        transaction_create.value,
        transaction_create.description
    );
end;
$$ language plpgsql;
call allow_function('transaction_create');
