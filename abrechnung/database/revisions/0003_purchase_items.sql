-- revision: 1f1033da
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
    -- deleted can be set to false at any time.
    deleted           bool             not null default true,

    -- the name of the item
    name              text             not null,
    -- the amount of the item (in 'unit').
    amount            double precision not null,
    -- the unit in which the amount is given. null means pieces.
    unit              text                      default null,
    -- the price - either per unit or in total, in the transaction currency.
    price             double precision not null,
    -- if true, the price is per unit. if false, the price is for the entirety.
    price_is_per_unit boolean          not null default true,

    description       text             not null default ''
);

-- an usage of an item by an account,
-- causing part of the item price to be debited to that account.
create table if not exists item_usage (
    item_id     integer          not null references purchase_item (id) on delete restrict,
    revision_id bigint references transaction_revision (id) on delete cascade,

    -- the account that is debited
    account_id  integer          not null references account (id) on delete restrict,
    primary key (item_id, revision_id, account_id),

    -- the absolute amount (of the item amount) to debit to this account.
    amount      double precision not null default 0.0,
    -- the number of shares of the item to debit to this account.
    -- first, all 'amount'-based shares are debited.
    -- the remaining amount is debited to accounts based on shares.
    -- if no share-based item usages are defined for the account at all,
    -- the purchases' debitor shares are used.
    -- otherwise, the item-specific shares are used.
    shares      double precision          default null
);
