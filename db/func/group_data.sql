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
    authtoken uuid,
    revision_id bigint,
    out user_id integer,
    out group_id integer
)
as $$
<<locals>>
declare
    commited timestamptz;
begin
    select session_auth(session_auth_revision.authtoken) into session_auth_revision.user_id;

    select
        revision.commited,
        coalesce(transaction.grp, account.grp)
    into
        locals.commited,
        session_auth_revision.group_id
    from
        revision
    left join
        account on account.id = revision.account
    left join
        transaction on transaction.id = revision.transaction
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

-- validates an existing login session token,
-- and returns the usr.id of the user this authenticates as
-- as well as the group id of the transaction.
--
-- also checks that the user is allowed to read the given transaction.
--
-- designed for internal use by all functions that accept a session authtoken,
-- and want to read transactions.
--
-- methods that call this can raise:
--
-- - bad-authtoken
-- - no-change-ownership
-- - change-already-commited
create or replace function session_auth_transaction(
    authtoken uuid,
    transaction_id bigint,
    need_write_permission boolean default false,
    out user_id integer,
    out group_id integer
)
as $$
begin
    select session_auth(session_auth_transaction.authtoken) into session_auth_transaction.user_id;

    select
        transaction.grp
    into
        session_auth_transaction.group_id
    from
        transaction
    where
        transaction.id = session_auth_transaction.transaction_id;

    if not found then
        raise exception 'does-not-exists:a transaction with this id does not exist';
    end if;

    perform session_auth_group(session_auth_transaction.authtoken, session_auth_transaction.group_id, session_auth_transaction.need_write_permission);
end;
$$ language plpgsql;

-- sets the message of a change
create or replace procedure set_revision_message(
    authtoken uuid,
    revision_id integer,
    message text
)
as $$
begin
    select from session_auth_revision(set_revision_message.authtoken, set_revision_message.revision_id);

    update revision set revision.message = set_revision_message.message
    where revision.id = set_revision_message.revision_id;
end;
$$ language plpgsql;
call allow_function('set_revision_message', is_procedure := true);


-- returns all uncomited changes of a group
-- if only_mine is set to True, only the user's changes are returned
create or replace function get_uncommited_revisions(
    authtoken uuid,
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
    from session_auth_group(get_uncommited_revisions.authtoken, get_uncommited_revisions.group_id);

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

create or replace procedure _commit_revision(
    revision_id integer
)
as $$
begin
    -- ensure that the group has no inconsistencies during evaluation with this revision.
    -- TODO attempt to evaluate in the context of this user and check the consistency flag

    -- set the revision as commited
    update revision set commited = now() where revision.id = _commit_revision.revision_id;
end;
$$ language plpgsql;

-- commits a revision.
-- this is only allowed if the group evaluation with this change does not
-- reveal any inconsistencies.
--
-- can raise any of the errors from session_auth_group or session_auth_revision,
-- or group-data-inconsistent
create or replace procedure commit_revision(
    authtoken uuid,
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
    from session_auth_revision(commit_revision.authtoken, commit_revision.revision_id);

    -- ensure that the user is authorized to write the group
    perform session_auth_group(commit_revision.authtoken, locals.grp, true);

    -- ensure that the group has no inconsistencies during evaluation with this revision.
    -- TODO attempt to evaluate in the context of this user and check the consistency flag

    -- set the revision as commited
    call _commit_revision(commit_revision.revision_id);

    -- add a log entry for the commit
    insert into group_log (grp, usr, type, message)
    values (locals.grp, locals.usr, 'commit-revision', concat('commited revision #', commit_revision.revision_id));
end;
$$ language plpgsql;
call allow_function('commit_revision', is_procedure := true);


-- discards a change.
--
-- can raise any of the errors from session_auth_change.
create or replace procedure discard_revision(
    authtoken uuid,
    revision_id integer
)
as $$
begin
    -- ensure that the user is authorized to write this revision
    perform session_auth_revision(discard_revision.authtoken, discard_revision.revision_id);

    -- TODO: do not allow discarding of a revision if it is associated with a transaction history or account history without any predecessors.
    -- get rid of the revision
    delete from revision where revision.id = discard_revision.revision_id;
end;
$$ language plpgsql;
call allow_function('discard_revision', is_procedure := true);

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
            partition by account.id order by revision.commited nulls last
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
            partition by transaction.id order by revision.commited nulls last
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
    user_id integer;
begin
    select session_auth_group.user_id into locals.user_id
    from session_auth_group(transaction_create.authtoken, transaction_create.group_id, true);

    insert into transaction(grp, type)
    values (transaction_create.group_id, transaction_create.type)
    returning transaction.id into transaction_create.transaction_id;

    insert into revision (transaction, usr, message)
    values (transaction_create.transaction_id, locals.user_id, 'WIP: transaction')
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

-- start editing a transaction, i.e. add an uncommited transaction
-- can raise any of the errors from session_auth_transaction.
create or replace function transaction_edit(
    authtoken uuid,
    transaction_id integer,
    out revision_id bigint
)
as $$
<<locals>>
    declare
    user_id integer;
begin
    select session_auth_transaction.user_id into locals.user_id
    from session_auth_transaction(transaction_edit.authtoken, transaction_edit.transaction_id);

    insert into revision (usr, message, transaction)
    values (locals.user_id, 'edit transaction', transaction_edit.transaction_id)
    returning revision.id into transaction_edit.revision_id;
end;
$$ language plpgsql;
call allow_function('transaction_edit');

-- update a wip transaction history entry associated with the given revision_id. If no uncommited history entry exists
-- create a new one
-- can raise any of the errors from session_auth_revision.
create or replace procedure transaction_history_update(
    authtoken uuid,
    transaction_id integer,
    revision_id bigint,
    currency_symbol text,
    currency_conversion_rate double precision,
    value double precision,
    description text
)
as $$
begin
    perform from session_auth_transaction(transaction_history_update.authtoken, transaction_history_update.transaction_id);
    perform from session_auth_revision(transaction_history_update.authtoken, transaction_history_update.revision_id);

    insert into
        transaction_history (id, revision, currency_symbol, currency_conversion_rate, value, description)
    values (
        transaction_history_update.transaction_id,
        transaction_history_update.revision_id,
        transaction_history_update.currency_symbol,
        transaction_history_update.currency_conversion_rate,
        transaction_history_update.value,
        transaction_history_update.description
    )
    on conflict (id, revision) do update set
        currency_symbol = transaction_history_update.currency_symbol,
        currency_conversion_rate = transaction_history_update.currency_conversion_rate,
        value = transaction_history_update.value,
        description = transaction_history_update.description
    where
        transaction_history.id = transaction_history_update.transaction_id and
        transaction_history.revision = transaction_history_update.revision_id;

end;
$$ language plpgsql;
call allow_function('transaction_history_update', is_procedure := true);


-- get all creditor shares for a transaction
create or replace function transaction_creditor_shares_list(
    authtoken uuid,
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
    select session_auth_transaction.user_id into locals.user_id
    from session_auth_transaction(transaction_creditor_shares_list.authtoken, transaction_creditor_shares_list.transaction_id);

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
            and (revision.commited is not null or revision.usr = locals.user_id)
        window wnd as (
            partition by creditor_share.id order by revision.commited nulls last
        );
end;
$$ language plpgsql;
call allow_function('transaction_creditor_shares_list');

-- get all debitor shares for a transaction
create or replace function transaction_debitor_shares_list(
    authtoken uuid,
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
    select session_auth_transaction.user_id into locals.user_id
    from session_auth_transaction(transaction_debitor_shares_list.authtoken, transaction_debitor_shares_list.transaction_id);

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
            and (revision.commited is not null or revision.usr = locals.user_id)
        window wnd as (
            partition by debitor_share.id order by revision.commited nulls last
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
