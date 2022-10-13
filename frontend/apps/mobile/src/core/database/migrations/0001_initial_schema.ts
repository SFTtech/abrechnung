export const migration = [
    `create table if not exists abrechnung_instance (
        url               text primary key not null,
        user_id           integer          not null,
        username          text             not null,
        session_token     text             not null,
        -- TODO: write constraint to force this to be only one
        is_active_session boolean          not null default true, -- only one abrechnung instance can have is_active session as true
        access_token      text
    )`,

    `create table if not exists grp (
        id                       integer primary key not null,
--         abrechnung               text                not null references abrechnung_instance (url),
        "name"                   text                not null,
        description              text,
        terms                    text,
        currency_symbol          text                not null,
        created_by               integer,
        created_at               text                not null,
        add_user_account_on_join boolean             not null
    )`,

    `create table if not exists account (
        id                    integer primary key not null,
        "type"                text                not null,
        group_id              integer             not null references grp (id) on delete cascade,

        "name"                text                not null,
        description           text,
        priority              integer             not null,
        deleted               boolean             not null,
        owning_user_id        integer,
        revision_started_at   text                not null,
        revision_committed_at text,
        version               integer             not null,
        is_wip                boolean             not null,

        clearing_shares       text
    )`,

    `create table if not exists pending_account_changes (
        event_id      integer primary key autoincrement not null,
        event_time    text    not null,
        account_id    integer not null, -- account id, will be negative for local only accounts
        group_id      integer not null references grp (id) on delete cascade,
        event_content text    not null
    )`,

    `create table if not exists group_member (
        user_id   integer not null,
        group_id  integer not null references grp (id) on delete cascade,
        username  text    not null,
        is_owner  boolean not null,
        can_write boolean not null,
        primary key (user_id, group_id)
    )`,

    `create table if not exists "transaction" (
        id                       integer primary key not null,
        group_id                 integer             not null references grp (id) on delete cascade,
        description              text                not null,
        type                     text                not null,
        value                    real                not null,
        billed_at                text                not null,
        currency_conversion_rate real                not null,
        currency_symbol          text                not null,
        creditor_shares          text                not null,
        debitor_shares           text                not null,
        deleted                  boolean             not null,

        revision_started_at      text                not null,
        revision_committed_at    text,
        version                  integer             not null,
        is_wip                   boolean             not null
    )`,

    `create table if not exists pending_transaction_changes (
        event_id       integer primary key autoincrement not null,
        event_time     text    not null,
        transaction_id integer not null, -- transaction id, will be negative for local only transactions
        group_id       integer not null references grp (id) on delete cascade,
        event_content  text    not null
    )`,

    `create table if not exists transaction_position (
        id               integer primary key not null,
        group_id         integer             not null references grp (id) on delete cascade,
        transaction_id   integer             not null references "transaction" (id) on delete cascade,
        name             text                not null,
        price            real                not null,
        communist_shares real                not null,
        deleted          boolean             not null,
        usages           text                not null
    )`,

    `create table if not exists pending_transaction_position_changes (
        event_id       integer primary key autoincrement not null,
        event_time     text    not null,
        position_id    integer not null, -- position id, will be negative for local only positions
        group_id       integer not null references grp (id) on delete cascade,
        transaction_id integer not null, -- cannot use foreign key as can point to local only transaction
        event_content  text    not null
    )`,
];
