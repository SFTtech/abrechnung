-- abrechnung psql db

-- versioning of table schema, for db migrations

create table if not exists schema_version(
    version integer primary key,
    timestamp timestamptz not null default now()
);
insert into schema_version (version) values (1) on conflict do nothing;

-- websocket connections

create table if not exists forwarder(
    id text primary key,
    notification_channel_number serial not null
);

-- tracking of active connections of users to websocket forwarders
-- rows are added when somebody connects to a forwarder,
-- and deleted when they disconnect again.
create table if not exists connection(
    id bigserial primary key,
    forwarder text not null references forwarder(id) on delete cascade,
    started timestamptz not null default now()
);

-- this table should be populated in the palce where functions are defined
-- it contains a whitelist of functions that anybody can call publicly through
-- the websocket forwarder
create table if not exists allowed_function(
    name text primary key,
    requires_connection_id boolean not null default false,
    is_procedure boolean not null default false
);

-- user accounts

create table if not exists password_setting(
    -- arguments for pgcrypto.gen_salt()
    algorithm text not null,
    rounds int not null,
    primary key (algorithm, rounds),
    timestamp timestamptz not null default now()
);
insert into password_setting (algorithm, rounds) values ('bf', 12);


create table if not exists usr(
    id serial primary key,
    email text unique not null,
    -- pgcrypto crypt
    password text not null,
    registered_at timestamptz not null default now(),
    username text unique not null,
    -- preferred language
    language text not null default 'en_int',
    -- has database admin permissions
    admin boolean not null default false,
    -- registration is not completed yet
    pending boolean not null default true,
    -- user is allowed to upload files
    can_upload_files boolean not null default false,
    -- is deleted (users with changes can't be deleted)
    -- sessions must be cleared if a user is marked deleted
    deleted boolean not null default false
);

create table if not exists pending_registration(
    usr integer not null unique references usr(id) on delete cascade,
    token uuid primary key default gen_random_uuid(),
    -- gc should delete from usr where id=id if valid_until < now()
    valid_until timestamptz not null default now() + interval '1 hour',
    -- if NULL, the mail has been successfully sent
    -- if not NULL, the next attempt to send the mail should be attempted at that time
    mail_next_attempt timestamptz default now()
);

-- holds entries only for users which are neither deleted nor pending
create table if not exists pending_password_recovery(
    usr integer not null unique references usr(id) on delete cascade,
    token uuid primary key default gen_random_uuid(),
    -- gc should delete rows where valid_until < now()
    valid_until timestamptz not null default now() + interval '1 hour',
    -- if NULL, the mail has been successfully sent
    -- if not NULL, the next attempt to send the mail should be attempted at that time
    mail_next_attempt timestamptz default now()
);

-- holds entries only for users which are neither deleted nor pending
create table if not exists pending_email_change(
    usr integer not null unique references usr(id) on delete cascade,
    token uuid primary key default gen_random_uuid(),
    new_email text not null,
    -- gc should delete rows where valid_until < now()
    valid_until timestamptz not null default now() + interval '1 hour',
    -- if NULL, the mail has been successfully sent
    -- if not NULL, the next attempt to send the mail should be attempted at that time
    mail_next_attempt timestamptz default now()
);

-- tracking of login sessions
-- authtokens authenticate users directly
-- sessions can persist indefinitely and are typically bound to a certain client/device
-- holds entries only for users which are neither deleted nor pending
create table if not exists session(
    usr integer not null references usr(id) on delete cascade,
    id serial primary key,
    -- authtoken
    token uuid unique default gen_random_uuid(),
    -- last time this session token has been used
    last_seen timestamptz not null default now(),
    -- informational session name, chosen when logging in
    name text not null,
    -- can and should be NULL for infinite validity
    -- gc should delete this row when valid_until < now()
    valid_until timestamptz default null
);

-- media file hosting

create table if not exists hoster(
    id serial primary key,
    -- full URL to file with 'filename' hosted at this hoster: base_url + '/' + filename
    base_url text not null
);

-- tokens that allow users to upload files
-- these are independent of session tokens for security reasons
-- (file servers should not get access to session tokens)
create table if not exists file_upload_token(
    usr integer primary key references usr(id) on delete cascade,
    token uuid unique not null default gen_random_uuid()
);

create table if not exists file(
    -- gen_random_uuid() plus suitable file extension
    filename text primary key,
    -- hash of file content
    sha256 text not null,
    file_mime text not null
);

-- a single file can be uploaded at multiple hosters
create table if not exists file_hoster(
    -- if a file is deleted from the file table, it still stays here to
    -- allow garbage collection by the hoster
    filename text primary key references file(filename) on delete no action,
    hoster integer not null references hoster(id) on delete cascade
);

-- this allows users to see (and use) the files they have uploaded,
-- and the admin to track e.g. copyright violations to users
-- multiple users could upload the same file, so this needs its own table
create table if not exists file_uploader(
    -- files can be deleted if deleted = true
    filename text references file(filename) on delete no action,
    -- usrs who have uploaded files cannot be deleted
    usr integer references usr(id) on delete restrict,
    uploaded timestamptz not null,
    -- whether the uploader has deleted the file
    deleted bool not null default false
);

-- groups

-- groups are typically active for a limited time period;
-- e.g. for a LAN party, and only manage the account balances of a limited
-- set of people
create table if not exists grp (
    id serial primary key,
    name text not null,
    description text not null default '',
    -- terms for participating in the group,
    -- e.g. "you have to pay your entire due balance before august 8th"
    terms text not null default '',
    -- currency (symbol) to use in the group
    currency_symbol text not null,

    created timestamptz not null default now()
);

create table if not exists group_membership (
    usr integer references usr(id) on delete cascade,
    grp integer references grp(id) on delete cascade,
    primary key(usr, grp),

    joined timestamptz not null default now(),

    -- optional user description text
    description text not null default '',

    -- owner permissions allow editing the group name, description, terms and currency.
    -- anybody with owner permissions can grant and revoke owner permissions.
    is_owner bool not null default false,
    -- write permissions allow creating changes.
    -- anybody with write permissions can grant and revoke write permissions.
    can_write bool not null default true,

    -- the user that invited this person
    invited_by integer default null references usr(id) on delete restrict
);

-- active group invites that allow users to join a group
create table if not exists group_invite (
    id bigserial unique,

    -- the group that the token grants access to
    grp integer references grp(id) on delete cascade,
    token uuid primary key default gen_random_uuid(),
    -- description text for the authtoken
    description text not null,
    -- the user who has created the invite token
    created_by integer references usr(id) on delete cascade,
    -- can be NULL for infinite validity
    -- gc should delete this row when valid_until < now()
    valid_until timestamptz,
    -- if true, the token is auto-deleted when it's used to
    -- join the group
    single_use bool default true
);

-- log entries for the group.
-- holds messages about group membership changes,
-- group data changes, text messages, ...
create table if not exists group_log (
    id bigserial primary key,

    grp integer not null references grp(id) on delete cascade,
    -- user that's responsible for this log entry
    usr integer not null references usr(id) on delete restrict,

    logged timestamptz not null default now(),

    -- type of the entry.
    -- e.g.: 'create-group', 'grant-write', 'revoke-owner',
    --       'create-change', 'commit-change'
    type text not null,
    message text default '',

    -- user that was affected by the event (can be null, depends on event type)
    affected integer references usr(id) on delete restrict
);

-- group data, the actual purpose of the abrechnung
--
-- all items of group data are organized in two tables:
-- the base table, and the history table which has the name of the base table
-- plus an appended '_history'.
-- the base table contains - for each item, deleted or not - one row with
-- all information that is fixed for all time:
-- - the item id
-- - the group id
-- - other associated ids
-- the history table can contain multiple entries for each item.
-- each history table entry is linked to a change id,
-- and contains all information that can change over time:
-- - whether the item is valid (this is set to false in changes that delete it)
--   often there's conditions for when valid is allowed to be set to false.
-- - item-specific information, e.g. name, price, currency, ...

-- bookkeeping account
create table if not exists account (
    grp integer not null references grp(id) on delete cascade,
    id serial primary key
);

create type transaction_type as enum (
    -- a regular 'purchase' transaction, where multiple people purchased
    -- things, and one person paid the balance.
    -- must have exactly one creditor share (the person who paid)
    -- but can have multiple debitor shares
    -- (the people who profited i.e. consumed items from the purchase).
    -- can have purchase_items associated with it.
    -- the creditor share is exactly one;
    -- the debitor shares describe the magnitude in which unassigned
    -- purchase items were consumed by the debitors.
    -- note that typically the creditor is also listed as a debitor.
    -- not the entire purchase value is split among the debitors,
    -- just the parts that were not debited directly.
    'purchase',
    -- a transfer of balance from one account to another.
    -- must have exactly one creditor share
    -- (the account whose balance increases, e.g. who sent a bank transfer),
    -- and one debitor share
    -- (the account whose balance decreases, e.g. who received a bank transfer).
    -- must not have purchase_items associated with it (duh.)
    -- the creditor and debitor shares are exactly one.
    'transfer',
    -- a transfer of balance between any number of accounts
    -- (multiple-input multiple-output).
    -- can have more than one creditor share
    -- (every account that balance should be transferred to)
    -- and more than one debitor share
    -- (every account that balance should be transferred from).
    -- must not have purchase_items associated with it (duh.)
    -- creditor shares are equal to the amount that is credited to the accounts,
    -- debitor shares are equal to the amount that is debited to the account.
    'mimo'
);

-- any kind of transaction (see the types listed above)
create table if not exists transaction (
    grp integer references grp(id) on delete cascade,
    id serial primary key,

    type transaction_type not null
);

-- every data and history entry in a group references a change as a foreign key.
-- entries that have just been added, but not yet commited, reference a change
-- where the commited timestamp is null;
-- these uncommited changes are only visible if a user explicitly requests
-- to see them.
-- uncommited changes are created when users start to change a group,
-- and receive a 'commited' timestamp when the user clicks 'commit'.
-- changes that have been commited can no longer be modified.
create table if not exists revision (
    id bigserial primary key,

    -- users that have created changes cannot be deleted
    usr integer not null references usr(id) on delete restrict,

    -- a revision can either reference an account or a transaction
    account integer references account(id) on delete cascade,
    transaction integer references transaction(id) on delete cascade,

    started timestamptz not null default now(),
    commited timestamptz default null,

    message text not null,

    check ((account is null) <> (transaction is null))
    -- TODO: introduce check that only allows one uncommited revision per transaction / account per user
);

create table if not exists account_history (
    id integer references account(id) on delete restrict,
    revision bigint references revision(id) on delete cascade,
    primary key(id, revision),
    -- valid can only be false if no other valid item references the account id.
    valid bool not null default true,

    name text not null,
    description text not null default '',
    -- accounts with the highest priority are shown first. negative means hidden by default.
    priority integer not null
);

-- clearing relations between accounts.
-- accounts can be clearing accounts ("verrechnungskonto"),
-- temporary accounts whose balances are transferred to different accounts.
-- in Abrechnung, this balance transfer happens in a post-processing step:
-- first, all account balances are calculated according to the given
-- transactions.
-- then, accounts are cleared according to all clearing relations
-- e.g. the account balance from "spaghetti on wednsday" is transferred
-- in equal parts to the accounts "hans", "fritz", "elfriede", and the
-- account balance from "elfriede" is transferred to the account "fritz".
-- both "spaghetti on wednsday" and "elfriede" are clearing accounts,
-- no balance remains on them after clearing.
-- cycles between clearing accounts (e.g. "hans" clears to "fritz",
-- "fritz" clears to "elfriede" and "elfriede" clears to "hans" and "fritz"
-- are forbidden; if any are found, clearing is skipped, and commiting is
-- forbidden.
-- (cycles could in theory be resolved using linear algebra, but
--  neither comprehensibility nore numerical stability can be guaranteed).
create table if not exists account_clearing_relation (
    grp integer not null references grp(id) on delete cascade,
    id serial primary key,

    -- the account that is cleared.
    source integer not null references account(id) on delete restrict,
    -- the account to which the balance is transferred.
    -- if destination == source, the given share is actually kept on this account.
    -- this can be used if e.g. only half of the account's balance should be cleared.
    destination integer not null references account(id) on delete restrict,

    constraint account_clearing_relation_source_destination_unique unique (source, destination)
);

create table if not exists account_clearing_relation_history (
    id integer references account(id) on delete restrict,
    revision bigint references revision(id) on delete cascade,
    primary key(id, revision),
    -- valid cna be set to false at any time
    valid bool not null default true,

    -- the number of shares of the source account's balance that
    -- should be cleared to this destination account.
    -- balance transferred to destination :=
    --   balance of source * (shares / (sum of all shares with this source))
    shares double precision not null,
    constraint account_clearing_relation_history_shares_nonnegative check (shares >= 0),
    description text not null default ''
);

create table if not exists transaction_history (
    id integer references transaction(id) on delete restrict,
    revision bigint references revision(id) on delete cascade,
    primary key(id, revision),
    -- valid can be set to false at any time
    valid bool not null default true,
    -- currency (symbol) of the values inside this transaction
    currency_symbol text not null,
    -- the values of this transaction are multiplied with this for purposes of
    -- calculating group account balances.
    currency_conversion_rate double precision not null,
    -- total value of the transaction, in the transaction currency
    value double precision not null,

    description text not null default ''
);

-- a share that a transaction's creditor has in the transaction value
-- see the transaction_type documentation on what this means for the particular
-- transaction types.
-- transactions can only be evaluated if the sum of their creditor shares is > 0.
create table if not exists creditor_share (
    id serial primary key,

    -- the transaction whose value is credited
    transaction integer not null references transaction(id) on delete restrict,
    -- the account that is credited
    account integer not null references account(id) on delete restrict,
    constraint creditor_share_transaction_account_unique unique (transaction, account)
);

create table if not exists creditor_share_history (
    id integer references creditor_share(id) on delete restrict,
    revision bigint references revision(id) on delete cascade,
    primary key(id, revision),
    -- valid can be set to false at any time, but the transaction may
    -- become impossible to evaluate (making commiting impossible).
    valid bool not null default true,
    shares double precision not null default 1.0,
    description text not null default ''
);

-- a share that a transaction's debitor has in the transaction value
-- see the transaction_type documentation on what this means for the particular
-- transaction types.
-- transactions can only be evaluated if the sum of their debitor shares is > 0.
create table if not exists debitor_share (
    id serial primary key,

    -- the transaction whose value is debited
    transaction integer not null references transaction(id) on delete restrict,
    -- the account that is debited
    account integer not null references account(id) on delete restrict,
    constraint debitor_share_transaction_account_unique unique (transaction, account)
);

create table if not exists debitor_share_history (
    id integer references debitor_share(id) on delete restrict,
    revision bigint references revision(id) on delete cascade,
    primary key(id, revision),
    -- valid can be set to false if the debited account is not referenced by
    -- any item_consumption, but the transaction may
    -- become impossible to evaluate (making commiting impossible).
    valid bool not null default true,
    shares double precision not null default 1.0,
    description text not null default ''
);

-- an item in a 'purchase'-type transaction
create table if not exists purchase_item (
    transaction integer not null references transaction(id) on delete restrict,
    id serial primary key
);

create table if not exists purchase_item_history (
    id integer references purchase_item(id) on delete restrict,
    revision bigint references revision(id) on delete cascade,
    primary key(id, revision),
    -- valid can be set to false at any time.
    valid bool not null default true,

    -- the name of the item
    name text not null,
    -- the amount of the item (in 'unit').
    amount double precision not null,
    -- the unit in which the amount is given. null means pieces.
    unit text default null,
    -- the price - either per unit or in total, in the transaction currency.
    price double precision not null,
    -- if true, the price is per unit. if false, the price is for the entirety.
    price_is_per_unit boolean not null default true,

    description text not null default ''
);

-- an usage of an item by an account,
-- causing part of the item price to be debited to that account.
create table if not exists item_usage (
    id serial primary key,

    -- the transaction whose value is debited
    item integer not null references purchase_item(id) on delete restrict,
    -- the account that is debited
    account integer not null references debitor_share(id) on delete restrict,
    constraint item_usage_transaction_account_unique unique (item, account)
);

create table if not exists item_usage_history (
    id integer references item_usage(id) on delete restrict,
    revision bigint references revision(id) on delete cascade,
    primary key(id, revision),
    -- valid can be set to false at any time.
    valid bool not null default true,

    -- the absolute amount (of the item amount) to debit to this account.
    amount double precision not null default 0,
    -- the number of shares of the item to debit to this account.
    -- first, all 'amount'-based shares are debited.
    -- the remaining amount is debited to accounts based on shares.
    -- if no share-based item usages are defined for the account at all,
    -- the purchases' debitor shares are used.
    -- otherwise, the item-specific shares are used.
    shares double precision default null
);
