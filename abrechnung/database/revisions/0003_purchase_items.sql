-- migration: b32893f6
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
    price            double precision not null,
    -- part of the communist transaction shares this item is billed to
    communist_shares double precision not null default 1.0
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
    share_amount double precision not null
);