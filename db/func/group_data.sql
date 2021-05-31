-- validates an existing login session token,
-- and returns the usr.id of the user this authenticates as
-- as well as the group id of the revision.
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
create or replace function session_auth_revision(
    token uuid,
    revision_id bigint,
    out user_id integer,
    out group_id integer
)
as $$
<<locals>>
declare
    commited timestamptz;
begin
    select session_auth(session_auth_revision.token) into session_auth_revision.user_id;

    select
        revision.commited,
        transaction.grp or account.grp
    into
        locals.commited,
        session_auth_revision.group_id
    from
        revision
    join
        account on account.revision = revision.id
    join
        transaction on transaction.revision = revision.id
    where
        revision.id = session_auth_revision.revision_id and
        revision.usr = session_auth_revision.user_id;

    if not found then
        raise exception 'no-change-ownership:user does not own this change';
    end if;

    if commited is not null then
        raise exception 'change-already-commited:change has already been commited';
    end if;
end;
$$ language plpgsql;


-- sets the message of a change
create or replace procedure set_revision_message(
    token uuid,
    revision_id integer,
    message text
)
as $$
begin
    select from session_auth_revision(set_revision_message.token, set_revision_message.change_id);

    update revision set revision.message = set_revision_message.message
    where revision.id = set_revision_message.revision_id;
end;
$$ language plpgsql;
call allow_function('set_revision_message');


-- returns all uncomited changes of a group
-- if only_mine is set to True, only the user's changes are returned
create or replace function get_uncommited_revisions(
    token uuid,
    group_id integer,
    only_mine boolean
)
returns table (
    revision_id bigint,
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
    from session_auth_group(get_uncommited_revisions.token, get_uncommited_revisions.group_id);

    return query
    select
        revision.id as revision_id,
        revision.usr as user_id,
        revision.started as started,
        revision.message as message
    from
        revision
    left join account on revision.id = account.id
    left join transaction on revision.id = transaction.id
    where
        (transaction.grp = get_uncommited_revisions.group_id or account.grp = get_uncommited_revisions.group_id) and
        (revision.usr = locals.usr or not get_uncommited_revisions.only_mine);
end;
$$ language plpgsql;
call allow_function('get_uncommited_revisions');


-- commits a revision.
-- this is only allowed if the group evaluation with this change does not
-- reveal any inconsistencies.
--
-- can raise any of the errors from session_auth_group or session_auth_revision,
-- or group-data-inconsistent
create or replace procedure commit_revision(
    token uuid,
    revision_id integer
)
as $$
<<locals>>
declare
    usr integer;
    grp integer;
begin
    -- ensure that the user is authorized to write this revision
    select session_auth_revision.user_id, session_auth_revision.group_id
    into locals.usr, locals.grp
    from session_auth_revision(commit_revision.token, commit_revision.revision_id);

    -- ensure that the user is authorized to write the group
    select from session_auth_group(commit_revision.token, locals.grp, true);

    -- ensure that the group has no inconsistencies during evaluation with this revision.
    -- TODO attempt to evaluate in the context of this user and check the consistency flag

    -- set the revision as commited
    update revision set commited = now() where revision.id = commit_revision.revision_id;
    -- add a log entry for the commit
    insert into group_log (grp, usr, type, message)
    values (locals.grp, locals.usr, 'commit-revision', concat('commited revision #', commit_revision.revision_id));
end;
$$ language plpgsql;
call allow_function('commit_revision');


-- discards a change.
--
-- can raise any of the errors from session_auth_change.
create or replace procedure discard_revision(
    token uuid,
    revision_id integer
)
as $$
begin
    -- ensure that the user is authorized to write this revision
    select from session_auth_revision(discard_revision.token, discard_revision.revision_id);

    -- get rid of the revision
    delete from revision where revision.id = discard_revision.change_id;
end;
$$ language plpgsql;
call allow_function('discard_change');

-- retrieves the accounts in a group essentially returning the last account_history entry for each account
create or replace function account_list(
    authtoken uuid,
    group_id integer
)
returns table (
    account_id integer,
    revision_id bigint,
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
            account.id as account_id,
            last_value(history.revision) over wnd as revision_id,
            last_value(history.valid) over wnd as valid,
            last_value(history.name) over wnd as name,
            last_value(history.description) over wnd as description,
            last_value(history.priority) over wnd as priority
        from
            account_history history
        join
            account on account.id = history.id
        join
            revision on revision.account = account.id
        where
            account.grp = account_list.group_id
            and (revision.commited is not null or revision.usr = locals.usr)
        window wnd as (
            partition by revision.id order by revision.commited nulls last
        );
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
    out revision_id bigint
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

    insert into revision (account, usr, message, commited)
    values (account_create.account_id, locals.usr, concat('create account ', account_create.name), now())
    returning revision.id into account_create.revision_id;

    insert into account_history(id, revision, name, description, priority)
    values (account_create.account_id, account_create.revision_id, account_create.name, account_create.description, account_create.priority);
end;
$$ language plpgsql;
call allow_function('account_create');

-- retrieves all transactions in a group, essentially returning the last transaction_history entry for each transaction
create or replace function transaction_list(
    authtoken uuid,
    group_id integer
)
returns table (
    transaction_id integer,
    type text,
    revision_id bigint,
    valid bool,
    currency_symbol text,
    currency_conversion_rate double precision,
    value double precision,
    description text
)
as $$
<<locals>>
    declare
    user_id integer;
begin
    select session_auth_group.user_id into locals.user_id
    from session_auth_group(transaction_list.authtoken, transaction_list.group_id);

    return query
        select
            transaction.id as transaction_id,
            transaction.type::text as type,
            last_value(transaction_history.revision) over wnd as revision_id,
            last_value(transaction_history.valid) over wnd as valid,
            last_value(transaction_history.currency_symbol) over wnd as currency_symbol,
            last_value(transaction_history.currency_conversion_rate) over wnd as currency_conversion_rate,
            last_value(transaction_history.value) over wnd as value,
            last_value(transaction_history.description) over wnd as description
        from
            transaction
        join
            transaction_history on transaction.id = transaction_history.id
        join
            revision on transaction_history.revision = revision.id
        where
            transaction.grp = transaction_list.group_id
            and (revision.commited is not null or revision.usr = locals.user_id)
        window wnd as (
            partition by revision.id order by revision.commited nulls last
        );
end;
$$ language plpgsql;
call allow_function('transaction_list');

-- create a new transaction with an initial entry in the transaction's history
create or replace function transaction_create(
    authtoken uuid,
    group_id integer,
    type transaction_type,
    description text,
    currency_symbol text,
    currency_conversion_rate double precision,
    value double precision,
    out transaction_id integer,
    out revision_id bigint
)
as $$
<<locals>>
    declare
    usr integer;
begin
    select session_auth_group.user_id into locals.usr
    from session_auth_group(transaction_create.authtoken, transaction_create.group_id, true);

    insert into transaction(grp, type)
    values (transaction_create.group_id, transaction_create.type)
    returning transaction.id into transaction_create.transaction_id;

    insert into revision (transaction, usr, message)
    values (transaction_create.transaction_id, locals.usr, 'WIP: transaction')
    returning revision.id into transaction_create.revision_id;

    insert into transaction_history(id, revision, currency_symbol, currency_conversion_rate, value, description)
    values (
        transaction_create.transaction_id,
        transaction_create.revision_id,
        transaction_create.currency_symbol,
        transaction_create.currency_conversion_rate,
        transaction_create.value,
        transaction_create.description
    );
end;
$$ language plpgsql;
call allow_function('transaction_create');

-- get all creditor shares for a transaction
create or replace function transaction_creditor_shares_list(
    authtoken uuid,
    group_id integer,
    transaction_id integer
)
returns table (
    creditor_share_id integer,
    account_id integer,
    revision_id bigint,
    valid bool,
    shares double precision,
    description text
)
as $$
<<locals>>
    declare
    user_id integer;
begin
    select session_auth_group.user_id into locals.user_id
    from session_auth_group(transaction_creditor_shares_list.authtoken, transaction_creditor_shares_list.group_id);

    perform from transaction
    where transaction.id = transaction_creditor_shares_list.transaction_id and transaction.grp = transaction_creditor_shares_list.group_id;
    if not found then
        raise exception 'does-not-exist:a transaction creditor share with this id does not exist';
    end if;

    return query
        select
            creditor_share.id as creditor_share_id,
            creditor_share.account as account_id,
            last_value(creditor_share_history.revision) over wnd as revision_id,
            last_value(creditor_share_history.valid) over wnd as valid,
            last_value(creditor_share_history.shares) over wnd as shares,
            last_value(creditor_share_history.description) over wnd as description
        from
            creditor_share
        join
            creditor_share_history on creditor_share.id = creditor_share_history.id
        join
            revision on creditor_share_history.revision = revision.id
        where
            creditor_share.transaction = transaction_creditor_shares_list.transaction_id
        window wnd as (
            partition by revision.id order by revision.commited nulls last
        );
end;
$$ language plpgsql;
call allow_function('transaction_creditor_shares_list');


-- get all debitor shares for a transaction
create or replace function transaction_debitor_shares_list(
    authtoken uuid,
    group_id integer,
    transaction_id integer
)
returns table (
    debitor_share_id integer,
    account_id integer,
    revision_id bigint,
    valid bool,
    shares double precision,
    description text
)
as $$
<<locals>>
    declare
    user_id integer;
begin
    select session_auth_group.user_id into locals.user_id
    from session_auth_group(transaction_debitor_shares_list.authtoken, transaction_debitor_shares_list.group_id);

    perform from transaction
    where transaction.id = transaction_debitor_shares_list.transaction_id and transaction.grp = transaction_debitor_shares_list.group_id;
    if not found then
        raise exception 'does-not-exist:a transaction debitor share with this id does not exist';
    end if;

    return query
        select
            debitor_share.id as creditor_share_id,
            debitor_share.account as account_id,
            last_value(debitor_share_history.revision) over wnd as revision_id,
            last_value(debitor_share_history.valid) over wnd as valid,
            last_value(debitor_share_history.shares) over wnd as shares,
            last_value(debitor_share_history.description) over wnd as description
        from
            debitor_share
        join
            debitor_share_history on debitor_share.id = debitor_share_history.id
        join
            revision on debitor_share_history.revision = revision.id
        where
            debitor_share.transaction = transaction_debitor_shares_list.transaction_id
        window wnd as (
            partition by revision.id order by revision.commited nulls last
        );
end;
$$ language plpgsql;
call allow_function('transaction_debitor_shares_list');

-- get all purchase items with associated item shares for a 'purchase' transaction
create or replace function transaction_purchase_items_list(
    authtoken uuid,
    transaction_id integer
)
returns table (
    asdf int
)
as $$
<<locals>>
    declare
    usr integer;
    grp integer;
begin
    select session_auth_group.user_id into locals.usr
    from session_auth_group(transaction_purchase_items_list.authtoken, locals.group_id);

    select transaction.grp into locals.grp
    from transaction where transaction.id = transaction_purchase_items_list.transaction_id and transaction.type = 'purchase';
    if not found then
        raise exception 'transaction-not-found:a purchase transaction with this id does not exist';
    end if;

    return query
        select
            *
        from
            debitor_share
                join
            debitor_share_history on debitor_share.id = debitor_share_history.id
                join
            revision on debitor_share_history.revision = revision.id
                inner join (
                select
                    c.id, c.revision, nullif(max(coalesce(revision.commited, 'infinity'::timestamp)), 'infinity'::timestamp)
                from
                    debitor_share_history c
                        inner join
                    revision on c.revision = revision.id
                group by
                    c.id, c.revision
            ) filtered_history on debitor_share_history.id = filtered_history.id and debitor_share_history.revision = filtered_history.revision
        where
                debitor_share.transaction = transaction_debitor_shares_list.transaction_id;
end;
$$ language plpgsql;
call allow_function('transaction_debitor_shares_list');

create or replace function revision_list(
    authtoken uuid,
    group_id integer
)
returns table (
    revision_id bigint,
    user_id integer,
    account_id integer,
    transaction_id integer,
    started timestamptz,
    commited timestamptz,
    message text
)
as $$
<<locals>>
    declare
    user_id integer;
begin
    select session_auth_group.user_id into locals.user_id
    from session_auth_group(revision_list.authtoken, revision_list.group_id);

    return query
        select
            revision.id as revision_id,
            revision.usr as user_id,
            revision.account as account_id,
            revision.transaction as transaction_id,
            revision.started as started,
            revision.commited as commited,
            revision.message as message
        from revision
        where revision.commited is not null or revision.usr = locals.user_id;
end;
$$ language plpgsql;
call allow_function('revision_list');