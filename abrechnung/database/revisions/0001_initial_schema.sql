-- revision: 62df6b55
-- requires: null

-------------------------------------------------------------------------------
-- websocket connections

-- maps textual forwarder ids to notification channel identifiers
-- when a forwarder boots, it's inserted here,
-- and when it stops, it's removed here.
-- this table solely exists to delete old connections
-- when a forwarder hard-crashes and re-registers.
create table if not exists forwarder (
    id         text primary key not null,
    channel_id serial unique    not null
);

-- tracking of active connections of users to websocket forwarders
-- rows are added when somebody connects to a forwarder,
-- and deleted when they disconnect again.
create table if not exists connection (
    id         bigserial primary key,
    channel_id integer     not null references forwarder (channel_id) on delete cascade,
    started    timestamptz not null default now()
);

-------------------------------------------------------------------------------
-- user accounts
create table if not exists usr (
    id              serial primary key,
    email           text unique not null,
    hashed_password text        not null,
    registered_at   timestamptz not null default now(),
    username        text unique not null,
    -- registration is not completed yet
    pending         boolean     not null default true,
    -- is deleted (users with changes can't be deleted)
    -- sessions must be cleared if a user is marked deleted
    deleted         boolean     not null default false
);

create table if not exists pending_registration (
    user_id           integer     not null unique references usr (id) on delete cascade,
    token             uuid primary key     default gen_random_uuid(),
    -- gc should delete from usr where id=id if valid_until < now()
    valid_until       timestamptz not null default now() + interval '1 hour',
    -- if NULL, the mail has been successfully sent
    -- if not NULL, the next attempt to send the mail should be attempted at that time
    mail_next_attempt timestamptz          default now()
);

-- holds entries only for users which are neither deleted nor pending
create table if not exists pending_password_recovery (
    user_id           integer     not null unique references usr (id) on delete cascade,
    token             uuid primary key     default gen_random_uuid(),
    -- gc should delete rows where valid_until < now()
    valid_until       timestamptz not null default now() + interval '1 hour',
    -- if NULL, the mail has been successfully sent
    -- if not NULL, the next attempt to send the mail should be attempted at that time
    mail_next_attempt timestamptz          default now()
);

-- holds entries only for users which are neither deleted nor pending
create table if not exists pending_email_change (
    user_id           integer     not null unique references usr (id) on delete cascade,
    token             uuid primary key     default gen_random_uuid(),
    new_email         text        not null,
    -- gc should delete rows where valid_until < now()
    valid_until       timestamptz not null default now() + interval '1 hour',
    -- if NULL, the mail has been successfully sent
    -- if not NULL, the next attempt to send the mail should be attempted at that time
    mail_next_attempt timestamptz          default now()
);

-- tracking of login sessions
-- authtokens authenticate users directly
-- sessions can persist indefinitely and are typically bound to a certain client/device
-- holds entries only for users which are neither deleted nor pending
create table if not exists session (
    user_id     integer not null references usr (id) on delete cascade,
    id          serial primary key,
    -- authtoken
    token       uuid unique default gen_random_uuid(),
    -- last time this session token has been used
    last_seen timestamptz not null default now(),
    -- informational session name, chosen when logging in
    name        text    not null,
    -- can and should be NULL for infinite validity
    -- gc should delete this row when valid_until < now()
    valid_until timestamptz default null
);

-------------------------------------------------------------------------------
-- groups

-- groups are typically active for a limited time period;
-- e.g. for a LAN party, and only manage the account balances of a limited
-- set of people
create table if not exists grp (
    id              serial primary key,
    name            text        not null,
    description     text        not null default '',
    -- terms for participating in the group,
    -- e.g. "you have to pay your entire due balance before august 8th"
    terms           text        not null default '',
    -- currency (symbol) to use in the group
    currency_symbol text        not null,

    created_by      integer references usr (id) on delete restrict,
    created_at      timestamptz not null default now()
);

create table if not exists group_membership (
    user_id     integer references usr (id) on delete cascade,
    group_id    integer references grp (id) on delete cascade,
    primary key (user_id, group_id),

    joined_at   timestamptz not null default now(),

    -- optional user description text
    description text        not null default '',

    -- owner permissions allow editing the group name, description, terms and currency.
    -- anybody with owner permissions can grant and revoke owner permissions.
    is_owner    bool        not null default false,
    -- write permissions allow creating changes.
    -- anybody with write permissions can grant and revoke write permissions.
    can_write   bool        not null default true,

    -- the user that invited this person
    invited_by  integer              default null references usr (id) on delete restrict
);

-- active group invites that allow users to join a group
create table if not exists group_invite (
    id          bigserial unique,

    -- the group that the token grants access to
    group_id    integer not null references grp (id) on delete cascade,
    token       uuid primary key default gen_random_uuid(),
    -- description text for the authtoken
    description text    not null,
    -- the user who has created the invite token
    created_by  integer references usr (id) on delete cascade,
    -- can be NULL for infinite validity
    -- gc should delete this row when valid_until < now()
    valid_until timestamptz,
    -- if true, the token is auto-deleted when it's used to
    -- join the group
    single_use  bool             default true
);

-- log entries for the group.
-- holds messages about group membership changes,
-- group data changes, text messages, ...
create table if not exists group_log_type (
    name text not null primary key
);
insert into group_log_type (
    name
)
values (
    'group-created'
), (
    'write-granted'
), (
    'owner-granted'
), (
    'owner-revoked'
), (
    'write-revoked'
), (
    'transaction-committed'
), (
    'transaction-deleted'
), (
    'account-committed'
), (
    'account-deleted'
), (
    'member-joined'
), (
    'group-updated'
), (
    'invite-created'
), (
    'invite-deleted'
), (
    'text-message'
)
on conflict do nothing;

create table if not exists group_log (
    id       bigserial primary key,

    group_id integer     not null references grp (id) on delete cascade,
    -- user that's responsible for this log entry
    user_id  integer     not null references usr (id) on delete restrict,

    logged_at   timestamptz not null default now(),

    -- type of the entry.
    -- e.g.: 'create-group', 'grant-write', 'revoke-owner',
    --       'create-change', 'commit-change'
    type     text        not null references group_log_type(name) on delete restrict,
    message  text        not null default '',

    -- user that was affected by the event (can be null, depends on event type)
    affected integer references usr (id) on delete restrict
);


-------------------------------------------------------------------------------
-- group data, the real purpose of the abrechnung
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
create table if not exists account_type (
    name text not null primary key
);
insert into account_type (
    name
)
values (
    'personal'
)
on conflict do nothing;

create table if not exists account (
    group_id integer not null references grp (id) on delete cascade,
    id       serial primary key,

    type     text    not null references account_type (name)
);

create table if not exists account_revision (
    id         bigserial primary key,

    -- users that have created changes cannot be deleted
    user_id    integer     not null references usr (id) on delete restrict,

    account_id integer references account (id) on delete cascade,

    started    timestamptz not null default now(),
    committed  timestamptz          default null
);

create table if not exists account_history (
    id          integer references account (id) on delete cascade,
    revision_id bigint references account_revision (id) on delete cascade,
    primary key (id, revision_id),

    name        text    not null,
    description text    not null default '',
    -- accounts with the highest priority are shown first. negative means hidden by default.
    priority    integer not null,

    -- deleted can only be true if no other valid item references the account id.
    deleted     bool    not null default false
);

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

-- "transfer"
-- a transfer of balance from one account to another.
-- must have exactly one creditor share
-- (the account whose balance increases, e.g. who sent a bank transfer),
-- and one debitor share
-- (the account whose balance decreases, e.g. who received a bank transfer).
-- must not have purchase_items associated with it (duh.)
-- the creditor and debitor shares are exactly one.

-- a transfer of balance between any number of accounts
-- (multiple-input multiple-output).
-- can have more than one creditor share
-- (every account that balance should be transferred to)
-- and more than one debitor share
-- (every account that balance should be transferred from).
-- must not have purchase_items associated with it (duh.)
-- creditor shares are equal to the amount that is credited to the accounts,
-- debitor shares are equal to the amount that is debited to the account.
create table if not exists transaction_type (
    name text not null primary key
);
insert into transaction_type (
    name
)
values (
    'purchase'
), (
    'transfer'
), (
    'mimo'
)
on conflict do nothing;

-- any kind of transaction (see the types listed above)
create table if not exists transaction (
    group_id integer references grp (id) on delete cascade,
    id       serial primary key,

    type     text references transaction_type (name) not null
);

create table if not exists transaction_revision (
    id             bigserial primary key,

    -- users that have created changes cannot be deleted
    user_id        integer     not null references usr (id) on delete restrict,
    transaction_id integer     not null references transaction (id) on delete cascade,

    started        timestamptz not null default now(),
    committed      timestamptz          default null
);

create table if not exists transaction_history (
    id                       integer references transaction (id) on delete cascade,
    revision_id              bigint references transaction_revision (id) on delete cascade,
    primary key (id, revision_id),
    -- currency (symbol) of the values inside this transaction
    currency_symbol          text             not null,
    -- the values of this transaction are multiplied with this for purposes of
    -- calculating group account balances.
    currency_conversion_rate double precision not null,
    -- total value of the transaction, in the transaction currency
    value                    double precision not null,

    billed_at                date             not null,

    description              text             not null default '',

    -- deleted can be set to true at any time
    deleted                  bool             not null default false
);


create table if not exists creditor_share (
    transaction_id integer references transaction (id) on delete cascade,
    revision_id    bigint references transaction_revision (id) on delete cascade,

    -- the account that is credited
    account_id     integer          not null references account (id) on delete cascade,

    primary key (transaction_id, revision_id, account_id),

    shares         double precision not null default 1.0
);


create table if not exists debitor_share (
    transaction_id integer references transaction (id) on delete cascade,
    revision_id    bigint references transaction_revision (id) on delete cascade,

    -- the account that is credited
    account_id     integer          not null references account (id) on delete cascade,

    primary key (transaction_id, revision_id, account_id),

    shares         double precision not null default 1.0
);
