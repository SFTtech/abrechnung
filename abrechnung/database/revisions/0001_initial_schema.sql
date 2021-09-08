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

-- notify the mailer service on inserts or updates in the above tables
create or replace function pending_registration_updated() returns trigger as
$$
begin
    perform pg_notify('mailer', 'pending_registration');

    return null;
end;
$$ language plpgsql;

drop trigger if exists pending_registration_trig on pending_registration;
create trigger pending_registration_trig
    after insert or update
    on pending_registration
    for each row
execute function pending_registration_updated();

create or replace function pending_password_recovery_updated() returns trigger as
$$
begin
    perform pg_notify('mailer', 'pending_password_recovery');

    return null;
end;
$$ language plpgsql;

drop trigger if exists pending_password_recovery_trig on pending_password_recovery;
create trigger pending_password_recovery_trig
    after insert or update
    on pending_password_recovery
    for each row
execute function pending_password_recovery_updated();

create or replace function pending_email_change_updated() returns trigger as
$$
begin
    perform pg_notify('mailer', 'pending_email_change');

    return null;
end;
$$ language plpgsql;

drop trigger if exists pending_email_change_trig on pending_email_change;
create trigger pending_email_change_trig
    after insert or update
    on pending_email_change
    for each row
execute function pending_email_change_updated();

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

create or replace function check_committed_accounts(
    revision_id bigint,
    account_id integer,
    started timestamptz,
    committed timestamptz
) returns boolean as
$$
begin
    if committed is null then return true; end if;

    perform
    from
        account_revision ar
    where
        ar.account_id = check_committed_accounts.account_id
        and ar.id != check_committed_accounts.revision_id
        and ar.committed between check_committed_accounts.started and check_committed_accounts.committed;

    if found then raise 'another change was committed earlier, committing is not possible due to conflicts'; end if;

    return true;
end
$$ language plpgsql;

create or replace function check_account_revisions_change_per_user(
    account_id integer,
    user_id integer,
    committed timestamptz
) returns boolean as
$$
<<locals>> declare
begin
    if committed is not null then return true; end if;

    perform
    from
        account_revision ar
    where
        ar.account_id = check_account_revisions_change_per_user.account_id
        and ar.user_id = check_account_revisions_change_per_user.user_id
        and ar.committed is null;

    if found then raise 'users can only have one pending change per account'; end if;

    return true;
end
$$ language plpgsql;

create table if not exists account_revision (
    id         bigserial primary key,

    -- users that have created changes cannot be deleted
    user_id    integer     not null references usr (id) on delete restrict,

    account_id integer references account (id) on delete cascade,

    started    timestamptz not null default now(),
    committed  timestamptz          default null,

    check (check_committed_accounts(id, account_id, started, committed)),
    check (check_account_revisions_change_per_user(account_id, user_id, committed))
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

create or replace view latest_account as
    select distinct on (account.id, gm.user_id)
        account.id                                as id,
        account.type                              as type,
        account.group_id                          as group_id,
        first_value(history.revision_id) over wnd as revision_id,
        first_value(history.deleted) over wnd     as deleted,
        first_value(history.name) over wnd        as name,
        first_value(history.description) over wnd as description,
        first_value(history.priority) over wnd    as priority,
        gm.user_id                                as user_id
    from
        account_history history
        join account on account.id = history.id
        join account_revision r on r.id = history.revision_id
        join group_membership gm on account.group_id = gm.group_id
    where
        ((r.committed is null and r.user_id = gm.user_id) or
         r.committed is not null) window wnd as ( partition by account.id, gm.user_id order by r.committed desc nulls first );

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

-- every data and history entry in a group references a change as a foreign key.
-- entries that have just been added, but not yet committed, reference a change
-- where the committed timestamp is null;
-- these uncommitted changes are only visible if a user explicitly requests
-- to see them.
-- uncommitted changes are created when users start to change a group,
-- and receive a 'committed' timestamp when the user clicks 'commit'.
-- changes that have been committed can no longer be modified.
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

    -- check that the number of shares fits the transaction type and that deleted transactions have 0 shares.
    if locals.transaction_deleted then
        if locals.n_creditor_shares = 0 and locals.n_debitor_shares = 0 then
            return true;
        else
            raise 'deleted transaction cannot have any associated creditor or debitor shares';
        end if;
    end if;

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

create or replace function check_transaction_revisions_change_per_user(
    transaction_id integer,
    user_id integer,
    committed timestamptz
) returns boolean as
$$
<<locals>> declare
begin
    if committed is not null then return true; end if;

    perform
    from
        transaction_revision tr
    where
            tr.transaction_id = check_transaction_revisions_change_per_user.transaction_id
        and tr.user_id = check_transaction_revisions_change_per_user.user_id
        and tr.committed is null;

    if found then raise 'users can only have one pending change per transaction'; end if;

    return true;
end
$$ language plpgsql;

create table if not exists transaction_revision (
    id             bigserial primary key,

    -- users that have created changes cannot be deleted
    user_id        integer     not null references usr (id) on delete restrict,
    transaction_id integer     not null references transaction (id) on delete cascade,

    started        timestamptz not null default now(),
    committed      timestamptz          default null,

    check (check_committed_transactions(id, transaction_id, started, committed)),
    check (check_transaction_revisions_change_per_user(transaction_id, user_id, committed))
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
    value                    double precision not null check ( value > 0 ),

    billed_at                date             not null,

    description              text             not null default '',

    -- deleted can be set to true at any time
    deleted                  bool             not null default false
);

-- a share that a transaction's creditor has in the transaction value
-- see the transaction_type documentation on what this means for the particular
-- transaction types.
-- transactions can only be evaluated if the sum of their creditor shares is > 0.
create or replace function check_creditor_shares(
    transaction_id integer,
    revision_id bigint,
    account_id integer
) returns boolean as
$$
<<locals>> declare
    is_valid boolean;
begin
    with relevant_entries as (
        select *
        from
            creditor_share cs
        where
            cs.transaction_id = check_creditor_shares.transaction_id
            and cs.revision_id = check_creditor_shares.revision_id
            and cs.account_id != check_creditor_shares.account_id
                             )
    select
        not (t.type in ('purchase', 'transfer') and cs_counts.share_count >= 1)
    into locals.is_valid
    from
        transaction t
        join (
            select
                cs.transaction_id,
                cs.revision_id,
                count(*) as share_count
            from
                relevant_entries cs
            group by cs.transaction_id, cs.revision_id
             ) cs_counts on cs_counts.transaction_id = t.id;

    if not locals.is_valid then
        raise '"purchase" and "transfer" type transactions can only have one creditor share';
    end if;

    return locals.is_valid;
end
$$ language plpgsql;

create table if not exists creditor_share (
    transaction_id integer references transaction (id) on delete cascade,
    revision_id    bigint references transaction_revision (id) on delete cascade,

    -- the account that is credited
    account_id     integer          not null references account (id) on delete cascade,

    primary key (transaction_id, revision_id, account_id),

    shares         double precision not null default 1.0 check ( shares > 0 ),

    constraint creditor_share_account_count check (check_creditor_shares(transaction_id, revision_id, account_id))
);

-- a share that a transaction's debitor has in the transaction value
-- see the transaction_type documentation on what this means for the particular
-- transaction types.
-- transactions can only be evaluated if the sum of their debitor shares is > 0.
create or replace function check_debitor_shares(
    transaction_id integer,
    revision_id bigint,
    account_id integer
) returns boolean as
$$
<<locals>> declare
    is_valid boolean;
begin
    with relevant_entries as (
        select *
        from
            debitor_share cs
        where
            cs.transaction_id = check_debitor_shares.transaction_id
            and cs.revision_id = check_debitor_shares.revision_id
            and cs.account_id != check_debitor_shares.account_id
                             )
    select
        not (t.type in ('transfer') and cs_counts.share_count >= 1)
    into locals.is_valid
    from
        transaction t
        join (
            select
                cs.transaction_id,
                cs.revision_id,
                count(*) as share_count
            from
                relevant_entries cs
            group by cs.transaction_id, cs.revision_id
             ) cs_counts on cs_counts.transaction_id = t.id;

    if not locals.is_valid then raise '"transfer" type transactions can only have one debitor share'; end if;

    return locals.is_valid;
end
$$ language plpgsql;

create table if not exists debitor_share (
    transaction_id integer references transaction (id) on delete cascade,
    revision_id    bigint references transaction_revision (id) on delete cascade,

    -- the account that is credited
    account_id     integer          not null references account (id) on delete cascade,

    primary key (transaction_id, revision_id, account_id),

    shares         double precision not null default 1.0 check ( shares > 0 ),

    check (check_debitor_shares(transaction_id, revision_id, account_id))
);

create or replace view creditor_shares_as_json as
    select
        cs.revision_id    as revision_id,
        cs.transaction_id as transaction_id,
        sum(cs.shares)    as n_shares,
        json_agg(cs)      as shares
    from
        creditor_share cs
    group by
        cs.revision_id, cs.transaction_id;


create or replace view debitor_shares_as_json as
    select
        ds.revision_id    as revision_id,
        ds.transaction_id as transaction_id,
        sum(ds.shares)    as n_shares,
        json_agg(ds)      as shares
    from
        debitor_share ds
    group by
        ds.revision_id, ds.transaction_id;

create or replace view pending_transaction_history as
    select distinct on (transaction.id, gm.user_id)
        transaction.id                   as id,
        transaction.type                 as type,
        transaction.group_id             as group_id,
        history.revision_id              as revision_id,
        r.started                        as revision_started,
        r.committed                      as revision_committed,
        history.deleted                  as deleted,
        history.description              as description,
        history.value                    as value,
        history.billed_at                as billed_at,
        r.user_id                        as last_changed_by,
        history.currency_symbol          as currency_symbol,
        history.currency_conversion_rate as currency_conversion_rate,
        gm.user_id                       as user_id
    from
        transaction_history history
        join transaction on transaction.id = history.id
        join transaction_revision r on r.id = history.revision_id
        join group_membership gm on transaction.group_id = gm.group_id and gm.user_id = r.user_id
    where
        r.committed is null;

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
        history.user_id                  as user_id
    from
        pending_transaction_history history
        left join creditor_shares_as_json cs on cs.revision_id = history.revision_id and cs.transaction_id = history.id
        left join debitor_shares_as_json ds on ds.revision_id = history.revision_id and ds.transaction_id = history.id;

create or replace view committed_transaction_history as
    select distinct on (transaction.id)
        transaction.id                                         as id,
        transaction.type                                       as type,
        transaction.group_id                                   as group_id,
        first_value(history.revision_id) over wnd              as revision_id,
        first_value(r.started) over wnd                        as revision_started,
        first_value(r.committed) over wnd                      as revision_committed,
        first_value(history.deleted) over wnd                  as deleted,
        first_value(history.description) over wnd              as description,
        first_value(history.billed_at) over wnd                as billed_at,
        first_value(history.value) over wnd                    as value,
        first_value(r.user_id) over wnd                        as last_changed_by,
        first_value(history.currency_symbol) over wnd          as currency_symbol,
        first_value(history.currency_conversion_rate) over wnd as currency_conversion_rate
    from
        transaction_history history
        join transaction on transaction.id = history.id
        join transaction_revision r on r.id = history.revision_id
    where
        r.committed is not null window wnd as ( partition by transaction.id order by r.committed desc );

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
        coalesce(ds.shares, '[]'::json)  as debitor_shares
    from
        committed_transaction_history history
        left join creditor_shares_as_json cs on cs.revision_id = history.revision_id and cs.transaction_id = history.id
        left join debitor_shares_as_json ds on ds.revision_id = history.revision_id and ds.transaction_id = history.id;

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

create or replace view account_balance as
    select
        a.id                                                               as account_id,
        a.group_id                                                         as group_id,
        coalesce(cb.creditor_balance, 0) + coalesce(db.debitor_balance, 0) as balance
    from
        account a
        left join (
            select
                cs.account_id                                               as account_id,
                sum(cs.shares / coalesce(t.n_creditor_shares, 1) * t.value) as creditor_balance
            from
                committed_transaction_state t
                join creditor_share cs on t.revision_id = cs.revision_id and t.id = cs.transaction_id
            where
                t.deleted = false
            group by cs.account_id
                  ) cb on a.id = cb.account_id
        left join (
            select
                ds.account_id                                               as account_id,
                -sum(ds.shares / coalesce(t.n_debitor_shares, 1) * t.value) as debitor_balance
            from
                committed_transaction_state t
                join debitor_share ds on t.revision_id = ds.revision_id and t.id = ds.transaction_id
            where
                t.deleted = false
            group by ds.account_id
                  ) db on a.id = db.account_id;
