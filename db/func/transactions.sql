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
) as
$$
begin
    select session_auth(session_auth_transaction.authtoken) into session_auth_transaction.user_id;

    select
        transaction.grp
    into session_auth_transaction.group_id
    from
        transaction
    where
        transaction.id = session_auth_transaction.transaction_id;

    if not found then raise exception 'does-not-exists:a transaction with this id does not exist'; end if;

    perform session_auth_group(session_auth_transaction.authtoken, session_auth_transaction.group_id,
                               session_auth_transaction.need_write_permission);
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
) as
$$
begin
    select session_auth(session_auth_creditor_share.authtoken) into session_auth_creditor_share.user_id;

    select
        creditor_share.transaction
    into session_auth_creditor_share.transaction_id
    from
        creditor_share
    where
        creditor_share_id = session_auth_creditor_share.creditor_share_id;

    if not found then raise exception 'does-not-exists:a creditor share with this id does not exist'; end if;

    select
        session_auth_transaction.group_id
    into session_auth_creditor_share.group_id
    from
        session_auth_transaction(session_auth_creditor_share.authtoken, session_auth_creditor_share.transaction_id,
                                 session_auth_creditor_share.need_write_permission);
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
) as
$$
begin
    select session_auth(session_auth_debitor_share.authtoken) into session_auth_debitor_share.user_id;

    select
        debitor_share.transaction
    into session_auth_debitor_share.transaction_id
    from
        debitor_share
    where
        debitor_share_id = session_auth_debitor_share.debitor_share_id;

    if not found then raise exception 'does-not-exists:a debitor share with this id does not exist'; end if;

    select
        session_auth_transaction.group_id
    into session_auth_debitor_share.group_id
    from
        session_auth_transaction(session_auth_debitor_share.authtoken, session_auth_debitor_share.transaction_id,
                                 session_auth_debitor_share.need_write_permission);
end;
$$ language plpgsql;

-- latest transaction history as seen from a given user
create or replace view latest_transaction as
    select distinct on (transaction.id, gm.usr)
        transaction.id                                                    as id,
        transaction.grp                                                   as group_id,
        transaction.type::text                                            as type,
        last_value(transaction_history.revision) over wnd                 as revision_id,
        last_value(transaction_history.valid) over wnd                    as valid,
        last_value(transaction_history.currency_symbol) over wnd          as currency_symbol,
        last_value(transaction_history.currency_conversion_rate) over wnd as currency_conversion_rate,
        last_value(transaction_history.value) over wnd                    as value,
        last_value(transaction_history.description) over wnd              as description,
        gm.usr                                                            as user_id
    from
        transaction
        join transaction_history on transaction.id = transaction_history.id
        join revision on transaction_history.revision = revision.id
        join group_membership gm on transaction.grp = gm.grp
    where
        (revision.commited is null and revision.usr = gm.usr)
        or revision.commited is not null window wnd as ( partition by transaction.id, gm.usr order by revision.commited desc nulls first );

-- latest creditor_share history as seen from a given user
create or replace view latest_creditor_shares as
    select distinct on (creditor_share.id, gm.usr)
        creditor_share.id                                       as id,
        creditor_share.transaction                              as transaction_id,
        last_value(creditor_share_history.account) over wnd     as account_id,
        last_value(creditor_share_history.revision) over wnd    as revision_id,
        last_value(creditor_share_history.valid) over wnd       as valid,
        last_value(creditor_share_history.shares) over wnd      as shares,
        last_value(creditor_share_history.description) over wnd as description,
        gm.usr                                                  as user_id
    from
        creditor_share
        join creditor_share_history on creditor_share.id = creditor_share_history.id
        join revision on creditor_share_history.revision = revision.id
        join transaction on creditor_share.transaction = transaction.id
        join group_membership gm on transaction.grp = gm.grp
    where
        (revision.commited is null and revision.usr = gm.usr)
        or revision.commited is not null window wnd as ( partition by creditor_share.id, gm.usr order by revision.commited desc nulls first );

-- latest debitor_share history as seen from a given user
create or replace view latest_debitor_shares as
    select distinct on (debitor_share.id, gm.usr)
        debitor_share.id                                       as id,
        debitor_share.transaction                              as transaction_id,
        last_value(debitor_share_history.account) over wnd     as account_id,
        last_value(debitor_share_history.revision) over wnd    as revision_id,
        last_value(debitor_share_history.valid) over wnd       as valid,
        last_value(debitor_share_history.shares) over wnd      as shares,
        last_value(debitor_share_history.description) over wnd as description,
        gm.usr                                                 as user_id
    from
        debitor_share
        join debitor_share_history on debitor_share.id = debitor_share_history.id
        join revision on debitor_share_history.revision = revision.id
        join transaction on debitor_share.transaction = transaction.id
        join group_membership gm on transaction.grp = gm.grp
    where
        (revision.commited is null and revision.usr = gm.usr)
        or revision.commited is not null window wnd as ( partition by debitor_share.id, gm.usr order by revision.commited desc );

-- create or replace view balance as
-- select
--     account.grp as group_id,
--     account.id as account_id,
--     coalesce(sum(total.balance), 0) as balance
-- from account
-- left join (
--     select
--         lcs.account_id as account_id,
--         sum(lt.value * lcs.shares / lcs.total_transaction_shares) as balance
--     from latest_transaction lt
--     join latest_creditor_shares_with_sum lcs on lcs.transaction_id = lt.transaction_id
--     group by lt.group_id, lcs.account_id
--     union all
--     select
--         lds.account_id as account_id,
--         sum(- lt.value * lds.shares / lds.total_transaction_shares) as balance
--     from latest_transaction lt
--     join latest_debitor_shares_with_sum lds on lds.transaction_id = lt.transaction_id
--     group by lt.group_id, lds.account_id
-- ) total on account.id = total.account_id
-- group by account.grp, account.id;

-- retrieves all transactions in a group, essentially returning the last transaction_history entry for each transaction
create or replace function transaction_list(
    authtoken uuid,
    group_id integer
)
    returns table (
        id                       integer,
        type                     text,
        revision_id              bigint,
        valid                    bool,
        currency_symbol          text,
        currency_conversion_rate double precision,
        value                    double precision,
        description              text,
        total_creditor_shares    bigint,
        total_debitor_shares     bigint,
        creditor_shares          json,
        debitor_shares           json
    )
as
$$
<<locals>> declare
    user_id integer;
begin
    select
        session_auth_group.user_id
    into locals.user_id
    from
        session_auth_group(transaction_list.authtoken, transaction_list.group_id);

    return query select
                     lt.id                                         as id,
                     lt.type                                       as type,
                     lt.revision_id                                as revision_id,
                     lt.valid                                      as valid,
                     lt.currency_symbol                            as currency_symbol,
                     lt.currency_conversion_rate                   as currency_conversion_rate,
                     lt.value                                      as value,
                     lt.description                                as description,
                     latest_creditors.total_shares                 as total_creditor_shares,
                     latest_debitors.total_shares                  as total_debitor_shares,
                     coalesce(latest_creditors.shares, '[]'::json) as creditor_shares,
                     coalesce(latest_debitors.shares, '[]'::json)  as debitor_shares
                 from
                     latest_transaction lt
                     left join (
                         select
                             lc.transaction_id as transaction_id,
                             count(*)          as total_shares,
                             json_agg(lc)      as shares
                         from
                             latest_creditor_shares lc
                         where
                             lc.user_id = locals.user_id
                         group by lc.transaction_id
                               ) latest_creditors on latest_creditors.transaction_id = lt.id
                     left join (
                         select
                             lc.transaction_id as transaction_id,
                             count(*)          as total_shares,
                             json_agg(lc)      as shares
                         from
                             latest_debitor_shares lc
                         where
                             lc.user_id = locals.user_id
                         group by lc.transaction_id
                               ) latest_debitors on latest_debitors.transaction_id = lt.id
                 where
                     lt.user_id = locals.user_id
                     and lt.group_id = transaction_list.group_id;
end;
$$ language plpgsql;
call allow_function('transaction_list');

-- retrieves the detail of a transaction
create or replace function transaction_detail(
    authtoken uuid,
    transaction_id integer,
    out id integer,
    out type text,
    out revision_id bigint,
    out valid bool,
    out currency_symbol text,
    out currency_conversion_rate double precision,
    out value double precision,
    out description text,
    out creditor_shares json,
    out debitor_shares json
) as
$$
<<locals>> declare
    user_id integer;
begin
    select
        session_auth_transaction.user_id
    into locals.user_id
    from
        session_auth_transaction(transaction_detail.authtoken, transaction_detail.transaction_id);

    select
        lt.id,
        lt.type,
        lt.revision_id,
        lt.valid,
        lt.currency_symbol,
        lt.currency_conversion_rate,
        lt.value,
        lt.description,
        coalesce(latest_creditors.shares, '[]'::json),
        coalesce(latest_debitors.shares, '[]'::json)
    into transaction_detail.id, transaction_detail.type, transaction_detail.revision_id, transaction_detail.valid, transaction_detail.currency_symbol, transaction_detail.currency_conversion_rate, transaction_detail.value, transaction_detail.description, transaction_detail.creditor_shares, transaction_detail.debitor_shares
    from
        latest_transaction lt
        left join (
            select
                lc.transaction_id as transaction_id,
                json_agg(lc)      as shares
            from
                latest_creditor_shares lc
            where
                lc.user_id = locals.user_id
                and lc.transaction_id = transaction_detail.transaction_id
            group by lc.transaction_id
                  ) latest_creditors on latest_creditors.transaction_id = lt.id
        left join (
            select
                lc.transaction_id as transaction_id,
                json_agg(lc)      as shares
            from
                latest_debitor_shares lc
            where
                lc.user_id = locals.user_id
                and lc.transaction_id = transaction_detail.transaction_id
            group by lc.transaction_id
                  ) latest_debitors on latest_debitors.transaction_id = lt.id
    where
        lt.user_id = locals.user_id
        and lt.id = transaction_detail.transaction_id;
end;
$$ language plpgsql;
call allow_function('transaction_detail');

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
) as
$$
<<locals>> declare
    user_id integer;
begin
    select
        session_auth_group.user_id
    into locals.user_id
    from
        session_auth_group(transaction_create.authtoken, transaction_create.group_id, true);

    insert into transaction(
        grp, type
    )
    values (
        transaction_create.group_id, transaction_create.type
    )
    returning transaction.id into transaction_create.transaction_id;

    insert into revision (
        transaction, usr
    )
    values (
        transaction_create.transaction_id, locals.user_id
    )
    returning revision.id into transaction_create.revision_id;

    insert into transaction_history(
        id, revision, currency_symbol, currency_conversion_rate, value, description
    )
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
) as
$$
<<locals>> declare
    user_id integer;
begin
    select
        session_auth_transaction.user_id
    into locals.user_id
    from
        session_auth_transaction(transaction_edit.authtoken, transaction_edit.transaction_id);

    insert into revision (
        usr, transaction
    )
    values (
        locals.user_id, transaction_edit.transaction_id
    )
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
) as
$$
begin
    perform
    from
        session_auth_transaction(transaction_history_update.authtoken, transaction_history_update.transaction_id);
    perform from session_auth_revision(transaction_history_update.authtoken, transaction_history_update.revision_id);

    insert into transaction_history (
        id, revision, currency_symbol, currency_conversion_rate, value, description
    )
    values (
        transaction_history_update.transaction_id,
        transaction_history_update.revision_id,
        transaction_history_update.currency_symbol,
        transaction_history_update.currency_conversion_rate,
        transaction_history_update.value,
        transaction_history_update.description
    )
    on conflict (id, revision) do update set
                                             currency_symbol          = transaction_history_update.currency_symbol,
                                             currency_conversion_rate = transaction_history_update.currency_conversion_rate,
                                             value                    = transaction_history_update.value,
                                             description              = transaction_history_update.description
    where
        transaction_history.id = transaction_history_update.transaction_id
        and transaction_history.revision = transaction_history_update.revision_id;

end;
$$ language plpgsql;
call allow_function('transaction_history_update', is_procedure := true);

-- notifications for changes in transactions
create or replace function transaction_updated() returns trigger as
$$
<<locals>> declare
    group_id grp.id%TYPE;
    commited timestamptz;
    user_id  usr.id%TYPE;
begin
    -- A deletion should not be possible therefore NEW should never be NULL

    if NEW is null then
        select
            transaction.grp,
            revision.commited,
            revision.usr
        into locals.group_id, locals.commited, locals.user_id
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
        into locals.group_id, locals.commited, locals.user_id
        from
            transaction
            join revision on revision.id = NEW.revision
        where
            transaction.id = NEW.id;
    end if;

    if commited is null then -- we only want to notify the user to which the uncommited revision belongs to
        call notify_subscribers('transaction', locals.user_id, locals.group_id::bigint,
                                json_build_object('element_id', locals.group_id, 'transaction_id', OLD.id));
    else
        call notify_group('transaction', locals.group_id, locals.group_id::bigint,
                          json_build_object('element_id', locals.group_id, 'transaction_id', OLD.id));
    end if;
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists transaction_update_trig on transaction_history;
create trigger transaction_update_trig
    after insert or update or delete
    on transaction_history
    for each row
execute function transaction_updated();

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
) as
$$
begin
    perform
    from
        session_auth_transaction(transaction_creditor_share_create.authtoken,
                                 transaction_creditor_share_create.transaction_id);
    perform
    from
        session_auth_revision(transaction_creditor_share_create.authtoken,
                              transaction_creditor_share_create.revision_id);

    insert into creditor_share (
        transaction
    )
    values (
        transaction_creditor_share_create.transaction_id
    )
    returning creditor_share.id into transaction_creditor_share_create.creditor_share_id;

    insert into creditor_share_history (
        id, revision, shares, description, account
    )
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
) as
$$
begin
    perform
    from
        session_auth_creditor_share(transaction_creditor_share_update.authtoken,
                                    transaction_creditor_share_update.creditor_share_id);
    perform
    from
        session_auth_revision(transaction_creditor_share_update.authtoken,
                              transaction_creditor_share_update.revision_id);

    insert into creditor_share_history (
        id, revision, shares, description, account, valid
    )
    values (
        transaction_creditor_share_update.creditor_share_id,
        transaction_creditor_share_update.revision_id,
        transaction_creditor_share_update.shares,
        transaction_creditor_share_update.description,
        transaction_creditor_share_update.account_id,
        transaction_creditor_share_update.valid
    )
    on conflict (id, revision) do update set
                                             shares      = transaction_creditor_share_update.shares,
                                             description = transaction_creditor_share_update.description,
                                             account     = transaction_creditor_share_update.account_id,
                                             valid       = transaction_creditor_share_update.valid
    where
            creditor_share_history.id = transaction_creditor_share_update.creditor_share_id
        and creditor_share_history.revision = transaction_creditor_share_update.revision_id;
end;
$$ language plpgsql;
call allow_function('transaction_creditor_share_update', is_procedure := true);

-- notifications for changes in creditor shares
create or replace function creditor_share_updated() returns trigger as
$$
<<locals>> declare
    group_id       grp.id%TYPE;
    transaction_id transaction.id%TYPE;
    commited       timestamptz;
    user_id        usr.id%TYPE;
begin
    if NEW is null then -- the underlying revision was discarded
    -- TODO: figure out how to only send this update to the user the discarded revision belonged to
        select
            transaction.grp,
            creditor_share.transaction
        into locals.group_id, locals.transaction_id
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
        into locals.group_id, locals.transaction_id, locals.commited, locals.user_id
        from
            creditor_share
            join revision on revision.id = NEW.revision
            join transaction on creditor_share.transaction = transaction.id
        where
            creditor_share.id = NEW.id;

    end if;

    if commited is null then -- we only want to notify the user to which the uncommited revision belongs to
        call notify_subscribers('transaction', locals.user_id, locals.group_id::bigint,
                                json_build_object('element_id', locals.group_id, 'transaction_id',
                                                  locals.transaction_id));
    else
        call notify_group('transaction', locals.group_id, locals.group_id::bigint,
                          json_build_object('element_id', locals.group_id, 'transaction_id', locals.transaction_id));
    end if;
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists creditor_share_update_trig on creditor_share_history;
create trigger creditor_share_update_trig
    after insert or update or delete
    on creditor_share_history
    for each row
execute function creditor_share_updated();

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
) as
$$
begin
    perform
    from
        session_auth_transaction(transaction_debitor_share_create.authtoken,
                                 transaction_debitor_share_create.transaction_id);
    perform
    from
        session_auth_revision(transaction_debitor_share_create.authtoken, transaction_debitor_share_create.revision_id);

    insert into debitor_share (
        transaction
    )
    values (
        transaction_debitor_share_create.transaction_id
    )
    returning debitor_share.id into transaction_debitor_share_create.debitor_share_id;

    insert into debitor_share_history (
        id, revision, shares, description, account
    )
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
) as
$$
begin
    perform
    from
        session_auth_debitor_share(transaction_debitor_share_update.authtoken,
                                   transaction_debitor_share_update.debitor_share_id);
    perform
    from
        session_auth_revision(transaction_debitor_share_update.authtoken, transaction_debitor_share_update.revision_id);

    insert into debitor_share_history (
        id, revision, shares, description, account, valid
    )
    values (
        transaction_debitor_share_update.debitor_share_id,
        transaction_debitor_share_update.revision_id,
        transaction_debitor_share_update.shares,
        transaction_debitor_share_update.description,
        transaction_debitor_share_update.account_id,
        transaction_debitor_share_update.valid
    )
    on conflict (id, revision) do update set
                                             shares      = transaction_debitor_share_update.shares,
                                             description = transaction_debitor_share_update.description,
                                             account     = transaction_debitor_share_update.account_id,
                                             valid       = transaction_debitor_share_update.valid
    where
            debitor_share_history.id = transaction_debitor_share_update.debitor_share_id
        and debitor_share_history.revision = transaction_debitor_share_update.revision_id;
end;
$$ language plpgsql;
call allow_function('transaction_debitor_share_update', is_procedure := true);

-- notifications for changes in debitor shares
create or replace function debitor_share_updated() returns trigger as
$$
<<locals>> declare
    group_id       grp.id%TYPE;
    transaction_id transaction.id%TYPE;
    commited       timestamptz;
    user_id        usr.id%TYPE;
begin
    if NEW is null then -- the underlying revision was discarded
    -- TODO: figure out how to only send this update to the user the discarded revision belonged to
        select
            transaction.grp,
            debitor_share.transaction
        into locals.group_id, locals.transaction_id
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
        into locals.group_id, locals.transaction_id, locals.commited, locals.user_id
        from
            debitor_share
            join revision on revision.id = NEW.revision
            join transaction on debitor_share.transaction = transaction.id
        where
            debitor_share.id = NEW.id;
    end if;

    if commited is null then -- we only want to notify the user to which the uncommited revision belongs to
        call notify_subscribers('transaction', locals.user_id, locals.group_id::bigint,
                                json_build_object('element_id', locals.group_id, 'transaction_id',
                                                  locals.transaction_id));
    else
        call notify_group('transaction', locals.group_id, locals.group_id::bigint,
                          json_build_object('element_id', locals.group_id, 'transaction_id', locals.transaction_id));
    end if;
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists debitor_share_update_trig on debitor_share_history;
create trigger debitor_share_update_trig
    after insert or update or delete
    on debitor_share_history
    for each row
execute function debitor_share_updated();
