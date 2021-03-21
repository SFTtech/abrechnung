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
    -- is deleted (users with commits can't be deleted)
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
    -- eurocentric all the way
    currency text not null default '€',

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
    -- write permissions allow creating commits.
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
-- holds messages about group membership changes, commits, text messages, ...
create table if not exists group_log (
    id bigserial primary key,

    grp integer not null references grp(id) on delete cascade,
    -- user that's responsible for this log entry
    usr integer not null references usr(id) on delete restrict,

    logged timestamptz not null default now(),

    -- type of the entry.
    -- e.g.: 'create-group', 'grant-write', 'revoke-owner', 'create-commit'
    type text not null,
    message text default '',

    -- user that was affected by the event (can be null, depends on event type)
    affected integer references usr(id) on delete restrict
);

-- every data and history entry in a group references a commit as a foreign key.
-- entries that have been just added, but not yet commited, reference a special commit with
-- a negative id;
-- the commits table contains one such entry for every usr and grp,
-- which is created the moment a row is added to the group_membership table.
create table if not exists commit (
    id bigserial primary key,

    grp integer not null references grp(id) on delete cascade,
    -- user that have created commits cannot be deleted
    usr integer not null references usr(id) on delete restrict,

    timestamp timestamptz default now(),
    constraint timestamp_not_null check (id < 0 or timestamp is not null),

    message text not null
);

-- group data, the actual purpose of the abrechnung

-- bookkeeping account
create table if not exists account (
    grp integer not null references grp(id) on delete cascade,
    id serial primary key
);

create table if not exists account_history (
    id integer references account(id) on delete restrict,
    commit bigint references commit(id) on delete restrict,
    primary key(id, commit),
    -- valid = false must only be allowed if the account balance for this commit is 0.
    -- the account must not be involved in any account balance transfers with non-zero shares.
    -- this must be checked before valid = false is commited.
    valid bool not null default true,

    name text not null,
    description text not null default '',
    -- accounts with the highest priority are shown first. negative means hidden by default.
    priority integer not null
);

-- transfers of balances from one account to other accounts,
-- performed in the post-processing step of group account balance evaluation
-- ("verrechnungskonto")
create table if not exists account_balance_transfer (
    grp integer not null references grp(id) on delete cascade,
    id serial primary key,

    source integer not null references account(id) on delete restrict,
    -- if destination == source, the given share is actually kept on this account.
    -- this can be used if e.g. only half of the account's balance should be transferred.
    -- there must be no cycles where e.g. A transfers to B, B transfers to C and C transfers to A.
    -- even if it would still be resolvable, there would be a risk of it being numerically unstable,
    -- and it would be needlessly complex and hard to comprehend.
    -- this must be checked before any account balance transfer changes are commited.
    destination integer not null references account(id) on delete restrict,

    constraint source_destination_unique unique (source, destination)
);

create table if not exists account_balance_transfer_history (
    id integer references account(id) on delete restrict,
    commit bigint references commit(id) on delete restrict,
    primary key(id, commit),
    valid bool not null default true,

    shares double precision not null,
    constraint shares_nonnegative check (shares >= 0),
    description text not null default ''
);

-- alternate currencies that could be used in transactions
create table if not exists currency (
    grp integer not null references grp(id) on delete cascade,
    id serial primary key
);

create table if not exists currency_history (
    id integer references currency(id) on delete restrict,
    commit bigint references commit(id) on delete restrict,
    primary key(id, commit),
    -- valid = false must only be allowed if the currency is not referenced from anywhere.
    -- this must be checked before valid = false is commited.
    valid bool not null default true,

    symbol text not null,
    exchange_rate double precision not null
);

-- a simple transaction, simply transferring balance from one account to another
create table if not exists transaction (
    grp integer references grp(id) on delete cascade,
    id serial primary key
);

create table if not exists transaction_history (
    id integer references transaction(id) on delete restrict,
    commit bigint references commit(id) on delete restrict,
    primary key(id, commit),
    valid bool not null default true,

    -- the account whose balance is changed += value
    debited integer not null references account(id) on delete restrict,
    -- the account whose balance is changed -= value
    credited integer not null references account(id) on delete restrict,
    value double precision,
    currency integer default null references currency(id) on delete restrict
);
