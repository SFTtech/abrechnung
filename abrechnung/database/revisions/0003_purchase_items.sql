-- revision: b32893f6
-- requires: 83a50a30

-- an item in a 'purchase'-type transaction
create table if not exists purchase_item (
    transaction_id integer not null references transaction (id) on delete restrict,
    id             serial primary key
);

create table if not exists purchase_item_history (
    id                integer references purchase_item (id) on delete restrict,
    revision_id       bigint references transaction_revision (id) on delete cascade,
    primary key (id, revision_id),
    -- deleted can be set to true at any time.
    deleted           bool             not null default false,

    -- the name of the item
    name              text             not null,
    -- the total price, in the transaction currency.
    price             double precision not null check( price > 0 ),
    -- part of the communist transaction shares this item is billed to
    communist_shares  double precision not null default 1.0 check (communist_shares >= 0)
);

-- an usage of an item by an account,
-- causing part of the item price to be debited to that account.
create table if not exists purchase_item_usage (
    item_id     integer          not null references purchase_item (id) on delete restrict,
    revision_id bigint references transaction_revision (id) on delete cascade,

    -- the account that is debited
    account_id  integer          not null references account (id) on delete restrict,
    primary key (item_id, revision_id, account_id),

    -- amount of shares this account has from the purchase item
    share_amount      double precision not null check ( share_amount > 0 )
);

create or replace view purchase_item_usages_as_json as
select
    piu.revision_id         as revision_id,
    piu.item_id             as item_id,
    sum(piu.share_amount)   as n_usages,
    json_agg(piu)           as usages
from
    purchase_item_usage piu
group by
    piu.revision_id, piu.item_id;

create or replace view pending_purchase_item_history as
select distinct on (pi.id, gm.user_id)
    pi.id                           as id,
    pi.transaction_id               as transaction_id,
    transaction.group_id            as group_id,
    pih.revision_id                 as revision_id,
    r.started                       as revision_started,
    r.committed                     as revision_committed,
    pih.deleted                     as deleted,
    pih.name                        as name,
    pih.price                       as price,
    pih.communist_shares            as communist_shares,
    r.user_id                       as last_changed_by,
    gm.user_id                      as user_id
from purchase_item_history pih
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
    left join purchase_item_usages_as_json piu on piu.revision_id = history.revision_id and history.id = piu.item_id;

create or replace view committed_purchase_item_history as
select distinct on (pi.id)
    pi.id                                           as id,
    pi.transaction_id                               as transaction_id,
    transaction.group_id                            as group_id,
    first_value(pih.revision_id) over wnd           as revision_id,
    first_value(r.started) over wnd                 as revision_started,
    first_value(r.committed) over wnd               as revision_committed,
    first_value(pih.deleted) over wnd               as deleted,
    first_value(pih.name) over wnd                  as name,
    first_value(pih.price) over wnd                 as price,
    first_value(pih.communist_shares) over wnd      as communist_shares,
    first_value(r.user_id) over wnd                 as last_changed_by
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
    coalesce(piu.usages, '[]'::json)  as usages
from
    committed_purchase_item_history history
        left join purchase_item_usages_as_json piu on piu.revision_id = history.revision_id and piu.item_id = history.id;

create or replace view current_purchase_item_state as
select
    pi.id                 as id,
    pi.transaction_id     as transaction_id,
    transaction.group_id  as group_id,
    curr_state_json.state as current_state,
    pending_json.state    as pending_changes
from
    purchase_item pi
    join transaction on pi.transaction_id = transaction.id
        left join (
        select id, json_agg(curr_state) as state from committed_purchase_item_state curr_state group by id
    ) curr_state_json on curr_state_json.id = pi.id
        left join (
        select id, json_agg(pending) as state from pending_purchase_item_full pending group by id
    ) pending_json on pending_json.id = pi.id;

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

    if locals.transaction_deleted then  -- if the transaction is deleted we simply accept anything as we dont care
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

