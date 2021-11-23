-- revision: b32893f6
-- requires: 83a50a30

-- an item in a 'purchase'-type transaction
create table if not exists purchase_item (
    transaction_id integer not null references transaction (id) on delete restrict,
    id             serial primary key
);

create table if not exists purchase_item_history (
    id               integer references purchase_item (id) on delete restrict,
    revision_id      bigint references transaction_revision (id) on delete cascade,
    primary key (id, revision_id),
    -- deleted can be set to true at any time.
    deleted          bool             not null default false,

    -- the name of the item
    name             text             not null,
    -- the total price, in the transaction currency.
    price            double precision not null check ( price > 0 ),
    -- part of the communist transaction shares this item is billed to
    communist_shares double precision not null default 1.0 check (communist_shares >= 0)
);

-- an usage of an item by an account,
-- causing part of the item price to be debited to that account.
create table if not exists purchase_item_usage (
    item_id      integer          not null references purchase_item (id) on delete restrict,
    revision_id  bigint references transaction_revision (id) on delete cascade,

    -- the account that is debited
    account_id   integer          not null references account (id) on delete restrict,
    primary key (item_id, revision_id, account_id),

    -- amount of shares this account has from the purchase item
    share_amount double precision not null check ( share_amount > 0 )
);

create or replace view purchase_item_usages_as_json as
    select
        piu.revision_id       as revision_id,
        piu.item_id           as item_id,
        sum(piu.share_amount) as n_usages,
        json_agg(piu)         as usages
    from
        purchase_item_usage piu
    group by
        piu.revision_id, piu.item_id;

create or replace view pending_purchase_item_history as
    select distinct on (pi.id, gm.user_id)
        pi.id                as id,
        pi.transaction_id    as transaction_id,
        transaction.group_id as group_id,
        pih.revision_id      as revision_id,
        r.started            as revision_started,
        r.committed          as revision_committed,
        pih.deleted          as deleted,
        pih.name             as name,
        pih.price            as price,
        pih.communist_shares as communist_shares,
        r.user_id            as last_changed_by,
        gm.user_id           as user_id
    from
        purchase_item_history pih
        join purchase_item pi on pih.id = pi.id
        join transaction on transaction.id = pi.transaction_id
        join transaction_revision r on r.id = pih.revision_id and r.transaction_id = transaction.id
        join group_membership gm on transaction.group_id = gm.group_id and gm.user_id = r.user_id
    where
        r.committed is null;

create or replace view pending_purchase_item_full as
    select
        history.id                       as id,
        history.transaction_id           as transaction_id,
        history.group_id                 as group_id,
        history.revision_id              as revision_id,
        history.revision_started         as revision_started,
        history.revision_committed       as revision_committed,
        history.deleted                  as deleted,
        history.name                     as name,
        history.price                    as price,
        history.communist_shares         as communist_shares,
        history.last_changed_by          as last_changed_by,
        piu.n_usages                     as n_usages,
        coalesce(piu.usages, '[]'::json) as usages,
        history.user_id                  as user_id
    from
        pending_purchase_item_history history
        left join purchase_item_usages_as_json piu
                  on piu.revision_id = history.revision_id and history.id = piu.item_id;

create or replace view committed_purchase_item_history as
    select distinct on (pi.id)
        pi.id                                      as id,
        pi.transaction_id                          as transaction_id,
        transaction.group_id                       as group_id,
        first_value(pih.revision_id) over wnd      as revision_id,
        first_value(r.started) over wnd            as revision_started,
        first_value(r.committed) over wnd          as revision_committed,
        first_value(pih.deleted) over wnd          as deleted,
        first_value(pih.name) over wnd             as name,
        first_value(pih.price) over wnd            as price,
        first_value(pih.communist_shares) over wnd as communist_shares,
        first_value(r.user_id) over wnd            as last_changed_by
    from
        purchase_item_history pih
        join purchase_item pi on pih.id = pi.id
        join transaction on transaction.id = pi.transaction_id
        join transaction_revision r on r.id = pih.revision_id and r.transaction_id = pi.transaction_id
    where
        r.committed is not null window wnd as ( partition by pi.id order by r.committed desc );

create or replace view committed_purchase_item_state as
    select
        history.id                       as id,
        history.transaction_id           as transaction_id,
        history.group_id                 as group_id,
        history.revision_id              as revision_id,
        history.revision_started         as revision_started,
        history.revision_committed       as revision_committed,
        history.deleted                  as deleted,
        history.name                     as name,
        history.price                    as price,
        history.communist_shares         as communist_shares,
        history.last_changed_by          as last_changed_by,
        piu.n_usages                     as n_usages,
        coalesce(piu.usages, '[]'::json) as usages
    from
        committed_purchase_item_history history
        left join purchase_item_usages_as_json piu
                  on piu.revision_id = history.revision_id and piu.item_id = history.id;

drop view if exists account_balance;
drop view if exists current_transaction_state;
drop view if exists pending_transaction_revisions;
drop view if exists committed_transaction_state;

create or replace view pending_transaction_revisions as
    select
        history.id                       as id,
        history.type                     as type,
        history.group_id                 as group_id,
        history.revision_id              as revision_id,
        history.revision_started         as revision_started,
        history.revision_committed       as revision_committed,
        history.deleted                  as deleted,
        history.description              as description,
        history.value                    as value,
        history.billed_at                as billed_at,
        history.last_changed_by          as last_changed_by,
        history.currency_symbol          as currency_symbol,
        history.currency_conversion_rate as currency_conversion_rate,
        cs.n_shares                      as n_creditor_shares,
        ds.n_shares                      as n_debitor_shares,
        coalesce(cs.shares, '[]'::json)  as creditor_shares,
        coalesce(ds.shares, '[]'::json)  as debitor_shares,
        purchase_items.purchase_items    as purchase_items,
        history.user_id                  as user_id
    from
        pending_transaction_history history
        left join creditor_shares_as_json cs on cs.revision_id = history.revision_id and cs.transaction_id = history.id
        left join debitor_shares_as_json ds on ds.revision_id = history.revision_id and ds.transaction_id = history.id
        left join (
            select
                transaction_id,
                user_id,
                json_agg(ppif) as purchase_items
            from
                pending_purchase_item_full ppif
            group by ppif.transaction_id, ppif.user_id
                  ) purchase_items
                  on purchase_items.user_id = history.user_id and purchase_items.transaction_id = history.id;

create or replace view committed_transaction_state as
    select
        history.id                       as id,
        history.type                     as type,
        history.group_id                 as group_id,
        history.revision_id              as revision_id,
        history.revision_started         as revision_started,
        history.revision_committed       as revision_committed,
        history.deleted                  as deleted,
        history.description              as description,
        history.value                    as value,
        history.billed_at                as billed_at,
        history.last_changed_by          as last_changed_by,
        history.currency_symbol          as currency_symbol,
        history.currency_conversion_rate as currency_conversion_rate,
        cs.n_shares                      as n_creditor_shares,
        ds.n_shares                      as n_debitor_shares,
        coalesce(cs.shares, '[]'::json)  as creditor_shares,
        coalesce(ds.shares, '[]'::json)  as debitor_shares,
        purchase_items.purchase_items    as purchase_items
    from
        committed_transaction_history history
        left join creditor_shares_as_json cs on cs.revision_id = history.revision_id and cs.transaction_id = history.id
        left join debitor_shares_as_json ds on ds.revision_id = history.revision_id and ds.transaction_id = history.id
        left join (
            select
                transaction_id,
                json_agg(cpis) as purchase_items
            from
                committed_purchase_item_state cpis
            group by cpis.transaction_id
                  ) purchase_items on purchase_items.transaction_id = history.id;

create or replace view current_transaction_state as
    select
        transaction.id        as id,
        transaction.type      as type,
        transaction.group_id  as group_id,
        curr_state_json.state as current_state,
        pending_json.state    as pending_changes
    from
        transaction
        left join (
            select id, json_agg(curr_state) as state from committed_transaction_state curr_state group by id
                  ) curr_state_json on curr_state_json.id = transaction.id
        left join (
            select id, json_agg(pending) as state from pending_transaction_revisions pending group by id
                  ) pending_json on pending_json.id = transaction.id;

-- notifications for purchase items
create or replace function purchase_item_updated() returns trigger as
$$
<<locals>> declare
    group_id       grp.id%TYPE;
    transaction_id integer;
begin
    -- A deletion should not be possible therefore NEW should never be NULL
    if NEW is null then return null; end if;

    select
        transaction.group_id,
        transaction.id
    into locals.group_id, locals.transaction_id
    from
        transaction
        join purchase_item pi on transaction.id = pi.transaction_id
    where
        pi.id = NEW.id;

    call notify_group('transaction', locals.group_id, locals.group_id::bigint,
                      json_build_object('element_id', locals.group_id, 'transaction_id', locals.transaction_id));
    return null;
end;
$$ language plpgsql;

drop trigger if exists purchase_item_trig on purchase_item_history;
create trigger purchase_item_trig
    after insert or update or delete
    on purchase_item_history
    for each row
execute function purchase_item_updated();

create or replace function purchase_item_usage_updated() returns trigger as
$$
<<locals>> declare
    group_id       grp.id%TYPE;
    transaction_id integer;
begin
    if NEW is null then
        select
            transaction.group_id,
            transaction.id
        into locals.group_id, locals.transaction_id
        from
            transaction
            join purchase_item pi on transaction.id = pi.transaction_id
        where
            pi.id = OLD.item_id;
    else
        select
            transaction.group_id,
            transaction.id
        into locals.group_id, locals.transaction_id
        from
            transaction
            join purchase_item pi on transaction.id = pi.transaction_id
        where
            pi.id = NEW.item_id;
    end if;


    call notify_group('transaction', locals.group_id, locals.group_id::bigint,
                      json_build_object('element_id', locals.group_id, 'transaction_id', locals.transaction_id));
    return null;
end;
$$ language plpgsql;

drop trigger if exists purchase_item_usage_trig on purchase_item_usage;
create trigger purchase_item_usage_trig
    after insert or update or delete
    on purchase_item_usage
    for each row
execute function purchase_item_usage_updated();

create or replace function check_committed_transactions(
    revision_id bigint,
    transaction_id integer,
    started timestamptz,
    committed timestamptz
) returns boolean as
$$
<<locals>> declare
    n_creditor_shares   integer;
    n_debitor_shares    integer;
    transaction_type    text;
    transaction_deleted boolean;
begin
    if committed is null then return true; end if;

    perform
    from
        transaction_revision tr
    where
        tr.transaction_id = check_committed_transactions.transaction_id
        and tr.id != check_committed_transactions.revision_id
        and tr.committed between check_committed_transactions.started and check_committed_transactions.committed;

    if found then raise 'another change was committed earlier, committing is not possible due to conflicts'; end if;

    select
        t.type,
        th.deleted
    into locals.transaction_type, locals.transaction_deleted
    from
        transaction_history th
        join transaction t on t.id = th.id
    where
        th.revision_id = check_committed_transactions.revision_id;

    if locals.transaction_deleted then -- if the transaction is deleted we simply accept anything as we dont care
        return true;
    end if;

    select
        count(cs.account_id)
    into locals.n_creditor_shares
    from
        creditor_share cs
    where
        cs.transaction_id = check_committed_transactions.transaction_id
        and cs.revision_id = check_committed_transactions.revision_id;

    select
        count(ds.account_id)
    into locals.n_debitor_shares
    from
        debitor_share ds
    where
        ds.transaction_id = check_committed_transactions.transaction_id
        and ds.revision_id = check_committed_transactions.revision_id;

    -- check that the number of shares fits the transaction type
    if locals.transaction_type = 'transfer' then
        if locals.n_creditor_shares != 1 then
            raise '"transfer"  type transactions must have exactly one creditor share % %', locals.n_creditor_shares, locals.n_debitor_shares;
        end if;

        if locals.n_debitor_shares != 1 then
            raise '"transfer"  type transactions must have exactly one debitor share';
        end if;
    end if;

    if locals.transaction_type = 'purchase' then
        if locals.n_creditor_shares != 1 then
            raise '"purchase" type transactions must have exactly one creditor share';
        end if;
        if locals.n_debitor_shares < 1 then
            raise '"purchase" type transactions must have at least one debitor share';
        end if;

        -- check that all purchase items have at least an item share or communist shares > 0
        -- i.e. we look for a purchase item at the current revision that has sum(usages) + communist_shares <= 0
        -- if such a one is found we raise an exception
        perform from purchase_item pi
        join purchase_item_history pih on pi.id = pih.id
        left join purchase_item_usage piu on pih.revision_id = piu.revision_id and pi.id = piu.item_id
        where pih.revision_id = check_committed_transactions.revision_id
        and pi.transaction_id = check_committed_transactions.transaction_id
        and not pih.deleted
        group by pi.id
        having sum(coalesce(piu.share_amount, 0) + pih.communist_shares) <= 0;

        if found then
            raise 'all transaction positions must have at least one account assigned or their common shares set greater than 0';
        end if;
    end if;

    if locals.transaction_type = 'mimo' then
        if locals.n_creditor_shares < 1 then
            raise '"mimo" type transactions must have at least one creditor share';
        end if;
        if locals.n_debitor_shares < 1 then
            raise '"mimo" type transactions must have at least one debitor share';
        end if;
    end if;

    return true;
end
$$ language plpgsql;

