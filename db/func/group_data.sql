create or replace view latest_account as
select
    distinct on (account.id)
    account.id as account_id,
    account.grp as group_id,
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
    revision on revision.id = history.revision
where
    revision.commited is not null
window wnd as (
    partition by account.id order by revision.commited desc nulls first
);

create or replace view latest_transaction as
select
    distinct on (transaction.id)
    transaction.id as transaction_id,
    transaction.grp as group_id,
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
    revision.commited is not null
window wnd as (
    partition by transaction.id order by revision.commited desc nulls first
);

create or replace view latest_creditor_shares as
select
    distinct on (creditor_share.id)
    creditor_share.id as creditor_share_id,
    creditor_share.transaction as transaction_id,
    last_value(creditor_share_history.account) over wnd as account_id,
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
    revision.commited is not null
window wnd as (
    partition by creditor_share.id order by revision.commited desc nulls first
);

create or replace view latest_creditor_shares_with_sum as
select
    lcs.creditor_share_id as creditor_share_id,
    lcs.transaction_id as transaction_id,
    lcs.account_id as account_id,
    lcs.revision_id as revision_id,
    lcs.valid as valid,
    lcs.shares as shares,
    lcs.description as description,
    sum(lcs.shares) over (partition by lcs.transaction_id) as total_transaction_shares
from
    latest_creditor_shares lcs;

create or replace view latest_debitor_shares as
select
    distinct on (debitor_share.id)
    debitor_share.id as debitor_share_id,
    debitor_share.transaction as transaction_id,
    last_value(debitor_share_history.account) over wnd as account_id,
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
    revision.commited is not null
window wnd as (
    partition by debitor_share.id order by revision.commited desc
);

create or replace view latest_debitor_shares_with_sum as
select
    lds.debitor_share_id as debitor_share_id,
    lds.transaction_id as transaction_id,
    lds.account_id as account_id,
    lds.revision_id as revision_id,
    lds.valid as valid,
    lds.shares as shares,
    lds.description as description,
    sum(lds.shares) over (partition by lds.transaction_id) as total_transaction_shares
from
    latest_debitor_shares lds;

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

-- validates an existing login session token,
-- and returns the usr.id of the user this authenticates as
-- as well as the group id of the creditor share.
--
-- also checks that the user is allowed to read or write the given creditor share.
--
-- designed for internal use by all functions that accept a session authtoken,
-- and want to read creditor shares.
--
-- methods that call this can raise:
--
-- - bad-authtoken
-- - no-change-ownership
-- - change-already-commited
create or replace function session_auth_creditor_share(
    authtoken uuid,
    creditor_share_id bigint,
    need_write_permission boolean default false,
    out user_id integer,
    out group_id integer,
    out transaction_id integer
)
as $$
begin
    select session_auth(session_auth_creditor_share.authtoken) into session_auth_creditor_share.user_id;

    select
        creditor_share.transaction
    into
        session_auth_creditor_share.transaction_id
    from creditor_share
    where creditor_share_id = session_auth_creditor_share.creditor_share_id;

    if not found then
        raise exception 'does-not-exists:a creditor share with this id does not exist';
    end if;

    select session_auth_transaction.group_id
    into session_auth_creditor_share.group_id
    from session_auth_transaction(session_auth_creditor_share.authtoken, session_auth_creditor_share.transaction_id, session_auth_creditor_share.need_write_permission);
end;
$$ language plpgsql;

-- validates an existing login session token,
-- and returns the usr.id of the user this authenticates as
-- as well as the group id of the debitor share.
--
-- also checks that the user is allowed to read or write the given debitor share.
--
-- designed for internal use by all functions that accept a session authtoken,
-- and want to read debitor shares.
--
-- methods that call this can raise:
--
-- - bad-authtoken
-- - no-change-ownership
-- - change-already-commited
create or replace function session_auth_debitor_share(
    authtoken uuid,
    debitor_share_id bigint,
    need_write_permission boolean default false,
    out user_id integer,
    out group_id integer,
    out transaction_id integer
)
as $$
begin
    select session_auth(session_auth_debitor_share.authtoken) into session_auth_debitor_share.user_id;

    select
        debitor_share.transaction
    into
        session_auth_debitor_share.transaction_id
    from debitor_share
    where debitor_share_id = session_auth_debitor_share.debitor_share_id;

    if not found then
        raise exception 'does-not-exists:a debitor share with this id does not exist';
    end if;

    select session_auth_transaction.group_id
    into session_auth_debitor_share.group_id
    from session_auth_transaction(session_auth_debitor_share.authtoken, session_auth_debitor_share.transaction_id, session_auth_debitor_share.need_write_permission);
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

create or replace view balance as
select
    account.grp as group_id,
    account.id as account_id,
    coalesce(sum(total.balance), 0) as balance
from account
left join (
    select
        lcs.account_id as account_id,
        sum(lt.value * lcs.shares / lcs.total_transaction_shares) as balance
    from latest_transaction lt
    join latest_creditor_shares_with_sum lcs on lcs.transaction_id = lt.transaction_id
    group by lt.group_id, lcs.account_id
    union all
    select
        lds.account_id as account_id,
        sum(- lt.value * lds.shares / lds.total_transaction_shares) as balance
    from latest_transaction lt
    join latest_debitor_shares_with_sum lds on lds.transaction_id = lt.transaction_id
    group by lt.group_id, lds.account_id
) total on account.id = total.account_id
group by account.grp, account.id;

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

-- notifications for changes in debitor shares
create or replace function revision_updated()
    returns trigger
as $$
<<locals>>
    declare
    group_id grp.id%TYPE;
    user_id usr.id%TYPE;
begin
    -- A deletion should not be possible therefore NEW should never be NULL
    if NEW is null then
        select coalesce(transaction.grp, account.grp)
        into locals.group_id
        from transaction, account
        where account.id = OLD.account or transaction.id = OLD.transaction;

        locals.user_id = OLD.usr;
    else
        select coalesce(transaction.grp, account.grp)
        into locals.group_id
        from transaction, account
        where account.id = NEW.account or transaction.id = NEW.transaction;

        locals.user_id = NEW.usr;
    end if;

    if NEW.commited is null then -- we only want to notify the user to which the uncommited revision belongs to
        call notify_subscribers(
                'revision',
                locals.user_id,
                locals.group_id::bigint,
                json_build_object('element_id', locals.group_id)
            );
    else
        call notify_group(
                'revision',
                locals.group_id,
                locals.group_id::bigint,
                json_build_object('element_id', locals.group_id)
            );
    end if;
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists revision_update_trig on revision;
create trigger revision_update_trig after insert or update or delete
    on revision
    for each row
execute function revision_updated();


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
    priority integer,
    balance double precision
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
            distinct on (account.id)
            account.id as account_id,
            last_value(history.revision) over wnd as revision_id,
            last_value(history.valid) over wnd as valid,
            last_value(history.name) over wnd as name,
            last_value(history.description) over wnd as description,
            last_value(history.priority) over wnd as priority,
            b.balance as balance
        from
            account_history history
        join
            account on account.id = history.id
        join
            balance b on b.account_id = account.id
        join
            revision on revision.id = history.revision
        where
            account.grp = account_list.group_id
            and (revision.commited is not null or revision.usr = locals.usr)
        window wnd as (
            partition by account.id order by revision.commited desc nulls first
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

-- updates an account account in a group
create or replace function account_edit(
    authtoken uuid,
    group_id integer,
    account_id integer,
    name text,
    description text,
    priority integer default 0,
    out revision_id bigint
)
as $$
<<locals>>
    declare
    usr integer;
begin
    select session_auth_group.user_id into locals.usr
    from session_auth_group(account_edit.authtoken, account_edit.group_id, true);

    perform from account where account.id = account_edit.account_id;

    if not found then
        raise 'account-not-found: an account with this id does not exist';
    end if;

    insert into revision (account, usr, message, commited)
    values (account_edit.account_id, locals.usr, concat('update account ', account_edit.account_id), now())
    returning revision.id into account_edit.revision_id;

    insert into account_history(id, revision, name, description, priority)
    values (account_edit.account_id, account_edit.revision_id, account_edit.name, account_edit.description, account_edit.priority);
end;
$$ language plpgsql;
call allow_function('account_edit');

-- notifications for changes in accounts
create or replace function account_updated()
returns trigger
as $$
<<locals>>
    declare
    group_id grp.id%TYPE;
begin
    -- A deletion should not be possible therefore NEW should never be NULL

    select
        account.grp
    into
        locals.group_id
    from
        account
    where
        account.id = NEW.id;

    call notify_group(
        'account',
        locals.group_id,
        locals.group_id::bigint,
        json_build_object('element_id', locals.group_id)
    );
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists account_update_trig on account_history;
create trigger account_update_trig after insert or update or delete
    on account_history
    for each row
execute function account_updated();

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
            distinct on (transaction.id)
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
            partition by transaction.id order by revision.commited desc nulls first
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

-- notifications for changes in transactions
create or replace function transaction_updated()
    returns trigger
as $$
<<locals>>
    declare
    group_id grp.id%TYPE;
    commited timestamptz;
    user_id usr.id%TYPE;
begin
    -- A deletion should not be possible therefore NEW should never be NULL

    if NEW is null then
        select
            transaction.grp,
            revision.commited,
            revision.usr
        into
            locals.group_id,
            locals.commited,
            locals.user_id
        from
            transaction
        join revision on revision.id = OLD.revision
        where
            transaction.id = OLD.id;
    else
        select
            transaction.grp,
            revision.commited,
            revision.usr
        into
            locals.group_id,
            locals.commited,
            locals.user_id
        from
            transaction
        join revision on revision.id = NEW.revision
        where
            transaction.id = NEW.id;
    end if;

    if commited is null then -- we only want to notify the user to which the uncommited revision belongs to
        call notify_subscribers(
            'transaction',
            locals.user_id,
            locals.group_id::bigint,
            json_build_object('element_id', locals.group_id)
        );
    else
        call notify_group(
            'transaction',
            locals.group_id,
            locals.group_id::bigint,
            json_build_object('element_id', locals.group_id)
        );
    end if;
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists transaction_update_trig on transaction_history;
create trigger transaction_update_trig after insert or update or delete
    on transaction_history
    for each row
execute function transaction_updated();

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
            distinct on (creditor_share.id)
            creditor_share.id as creditor_share_id,
            last_value(creditor_share_history.account) over wnd as account_id,
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
            partition by creditor_share.id order by revision.commited desc nulls first
        );
end;
$$ language plpgsql;
call allow_function('transaction_creditor_shares_list');

-- create a new creditor share and associate it with a WIP revision
-- can raise any of the errors from session_auth_transaction, session_auth_revision.
create or replace function transaction_creditor_share_create(
    authtoken uuid,
    transaction_id integer,
    account_id integer,
    revision_id bigint,
    shares double precision,
    description text,
    out creditor_share_id integer
)
as $$
begin
    perform from session_auth_transaction(transaction_creditor_share_create.authtoken, transaction_creditor_share_create.transaction_id);
    perform from session_auth_revision(transaction_creditor_share_create.authtoken, transaction_creditor_share_create.revision_id);

    insert into
        creditor_share (transaction)
    values (
        transaction_creditor_share_create.transaction_id
    ) returning creditor_share.id into transaction_creditor_share_create.creditor_share_id;

    insert into
        creditor_share_history (id, revision, shares, description, account)
    values (
        transaction_creditor_share_create.creditor_share_id,
        transaction_creditor_share_create.revision_id,
        transaction_creditor_share_create.shares,
        transaction_creditor_share_create.description,
        transaction_creditor_share_create.account_id
    );
end;
$$ language plpgsql;
call allow_function('transaction_creditor_share_create');

-- create a new creditor share and associate it with a WIP revision
-- can raise any of the errors from session_auth_transaction, session_auth_revision.
create or replace procedure transaction_creditor_share_update(
    authtoken uuid,
    revision_id bigint,
    creditor_share_id integer,
    account_id integer,
    shares double precision,
    description text,
    valid boolean default true
)
as $$
begin
    perform from session_auth_creditor_share(transaction_creditor_share_update.authtoken, transaction_creditor_share_update.creditor_share_id);
    perform from session_auth_revision(transaction_creditor_share_update.authtoken, transaction_creditor_share_update.revision_id);

    insert into
        creditor_share_history (id, revision, shares, description, account, valid)
    values (
        transaction_creditor_share_update.creditor_share_id,
        transaction_creditor_share_update.revision_id,
        transaction_creditor_share_update.shares,
        transaction_creditor_share_update.description,
        transaction_creditor_share_update.account_id,
        transaction_creditor_share_update.valid
    )
    on conflict (id, revision) do update set
        shares = transaction_creditor_share_update.shares,
        description = transaction_creditor_share_update.description,
        account = transaction_creditor_share_update.account_id,
        valid = transaction_creditor_share_update.valid
    where
        creditor_share_history.id = transaction_creditor_share_update.creditor_share_id and
        creditor_share_history.revision = transaction_creditor_share_update.revision_id;
end;
$$ language plpgsql;
call allow_function('transaction_creditor_share_update', is_procedure := true);

-- notifications for changes in creditor shares
create or replace function creditor_share_updated()
    returns trigger
as $$
<<locals>>
    declare
    group_id grp.id%TYPE;
    transaction_id transaction.id%TYPE;
    commited timestamptz;
    user_id usr.id%TYPE;
begin
    if NEW is null then -- the underlying revision was discarded
        -- TODO: figure out how to only send this update to the user the discarded revision belonged to
        select
            transaction.grp,
            creditor_share.transaction
        into
            locals.group_id,
            locals.transaction_id
        from
            creditor_share
        join revision on revision.id = OLD.revision
        join transaction on creditor_share.transaction = transaction.id
        where
            creditor_share.id = OLD.id;
    else
        select
            transaction.grp,
            creditor_share.transaction,
            revision.commited,
            revision.usr
        into
            locals.group_id,
            locals.transaction_id,
            locals.commited,
            locals.user_id
        from
            creditor_share
        join revision on revision.id = NEW.revision
        join transaction on creditor_share.transaction = transaction.id
        where
            creditor_share.id = NEW.id;

    end if;

    if commited is null and NEW is not null then -- we only want to notify the user to which the uncommited revision belongs to
        call notify_subscribers(
                'creditor_share',
                locals.user_id,
                locals.transaction_id::bigint,
                json_build_object('element_id', locals.transaction_id)
            );
    else
        call notify_group(
                'creditor_share',
                locals.group_id,
                locals.transaction_id::bigint,
                json_build_object('element_id', locals.transaction_id)
            );
    end if;
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists creditor_share_update_trig on creditor_share_history;
create trigger creditor_share_update_trig after insert or update or delete
    on creditor_share_history
    for each row
execute function creditor_share_updated();

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
            distinct on (debitor_share.id)
            debitor_share.id as debitor_share_id,
            last_value(debitor_share_history.account) over wnd as account_id,
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
            partition by debitor_share.id order by revision.commited desc nulls first
        );
end;
$$ language plpgsql;
call allow_function('transaction_debitor_shares_list');

-- create a new creditor share and associate it with a WIP revision
-- can raise any of the errors from session_auth_transaction, session_auth_revision.
create or replace function transaction_debitor_share_create(
    authtoken uuid,
    transaction_id integer,
    account_id integer,
    revision_id bigint,
    shares double precision,
    description text,
    out debitor_share_id integer
)
as $$
begin
    perform from session_auth_transaction(transaction_debitor_share_create.authtoken, transaction_debitor_share_create.transaction_id);
    perform from session_auth_revision(transaction_debitor_share_create.authtoken, transaction_debitor_share_create.revision_id);

    insert into
        debitor_share (transaction)
    values (
        transaction_debitor_share_create.transaction_id
    ) returning debitor_share.id into transaction_debitor_share_create.debitor_share_id;

    insert into
        debitor_share_history (id, revision, shares, description, account)
    values (
        transaction_debitor_share_create.debitor_share_id,
        transaction_debitor_share_create.revision_id,
        transaction_debitor_share_create.shares,
        transaction_debitor_share_create.description,
        transaction_debitor_share_create.account_id
    );
end;
$$ language plpgsql;
call allow_function('transaction_debitor_share_create');

-- update an existing debitor share, creating a new history entry if needed
-- can raise any of the errors from session_auth_transaction, session_auth_revision.
create or replace procedure transaction_debitor_share_update(
    authtoken uuid,
    revision_id bigint,
    debitor_share_id integer,
    account_id integer,
    shares double precision,
    description text,
    valid boolean default true
)
as $$
begin
    perform from session_auth_debitor_share(transaction_debitor_share_update.authtoken, transaction_debitor_share_update.debitor_share_id);
    perform from session_auth_revision(transaction_debitor_share_update.authtoken, transaction_debitor_share_update.revision_id);

    insert into
        debitor_share_history (id, revision, shares, description, account, valid)
    values (
        transaction_debitor_share_update.debitor_share_id,
        transaction_debitor_share_update.revision_id,
        transaction_debitor_share_update.shares,
        transaction_debitor_share_update.description,
        transaction_debitor_share_update.account_id,
        transaction_debitor_share_update.valid
    )
    on conflict (id, revision) do update set
        shares = transaction_debitor_share_update.shares,
        description = transaction_debitor_share_update.description,
        account = transaction_debitor_share_update.account_id,
        valid = transaction_debitor_share_update.valid
    where
        debitor_share_history.id = transaction_debitor_share_update.debitor_share_id and
        debitor_share_history.revision = transaction_debitor_share_update.revision_id;
end;
$$ language plpgsql;
call allow_function('transaction_debitor_share_update', is_procedure := true);

-- notifications for changes in debitor shares
create or replace function debitor_share_updated()
    returns trigger
as $$
<<locals>>
    declare
    group_id grp.id%TYPE;
    transaction_id transaction.id%TYPE;
    commited timestamptz;
    user_id usr.id%TYPE;
begin
    if NEW is null then -- the underlying revision was discarded
        -- TODO: figure out how to only send this update to the user the discarded revision belonged to
        select
            transaction.grp,
            debitor_share.transaction
        into
            locals.group_id,
            locals.transaction_id
        from
            debitor_share
        join transaction on debitor_share.transaction = transaction.id
        where
            debitor_share.id = OLD.id;
    else
        select
            transaction.grp,
            debitor_share.transaction,
            revision.commited,
            revision.usr
        into
            locals.group_id,
            locals.transaction_id,
            locals.commited,
            locals.user_id
        from
            debitor_share
        join revision on revision.id = NEW.revision
        join transaction on debitor_share.transaction = transaction.id
        where
            debitor_share.id = NEW.id;
    end if;

    if commited is null and NEW is not null then -- we only want to notify the user to which the uncommited revision belongs to
        call notify_subscribers(
                'debitor_share',
                locals.user_id,
                locals.transaction_id::bigint,
                json_build_object('element_id', locals.transaction_id, 'debitor_share_id', NEW.id)
            );
    else
        call notify_group(
                'debitor_share',
                locals.group_id,
                locals.transaction_id::bigint,
                json_build_object('element_id', locals.transaction_id, 'debitor_share_id', NEW.id)
            );
    end if;
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists debitor_share_update_trig on debitor_share_history;
create trigger debitor_share_update_trig after insert or update or delete
    on debitor_share_history
    for each row
execute function debitor_share_updated();

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
