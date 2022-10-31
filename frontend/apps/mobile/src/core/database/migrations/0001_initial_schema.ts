export const migration = [
    `create table if not exists abrechnung_instance (
        url               text primary key not null,
        user_id           integer          not null,
        username          text             not null,
        session_token     text             not null,
        -- TODO: write constraint to force this to be only one
        is_active_session boolean          not null default true -- only one abrechnung instance can have is_active session as true
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
        id                       integer primary key not null,
        group_id                 integer             not null references grp (id) on delete cascade,
        type                     text                not null,
        
        last_changed             text                not null,
        has_unpublished_changes  boolean             not null
    )`,

    `create table if not exists account_history (
        id                    integer primary key not null references account (id) on delete cascade,

        "name"                text                not null,
        description           text                not null,
        owning_user_id        integer,
        clearing_shares       text,
        deleted               boolean             not null
    )`,

    `create table if not exists pending_account_changes (
        id                    integer               not null references account (id) on delete cascade,
        change_id             integer primary key autoincrement not null,
        change_time           text                  not null,

        "name"                text                  not null,
        description           text                  not null,               
        owning_user_id        integer,
        clearing_shares       text,
        deleted               boolean               not null
    )`,

    `create view if not exists last_pending_account_changes as 
        select
            id,
            group_id,
            type,
            name,
            description,
            owning_user_id,
            clearing_shares,
            deleted,
            true as has_unpublished_changes,
            true as has_local_changes,
            change_time as last_changed
        from
            (
                select
                    row_number() over (partition by a.group_id, pac.id order by pac.change_id desc) as rank,
                    *
                from
                    account a join pending_account_changes pac on a.id = pac.id
                group by a.group_id
            ) sub
        where
            sub.rank = 1`,

    `create view if not exists committed_account_changes as
        select *
        from account_history ah join account a on a.id = ah.id`,

    `create view if not exists accounts_including_pending_changes as
        select
            lpac.id,
            lpac.group_id,
            lpac.type,
            lpac.name,
            lpac.description,
            lpac.owning_user_id,
            lpac.clearing_shares,
            lpac.deleted,
            lpac.has_unpublished_changes,
            lpac.has_local_changes,
            lpac.last_changed
        from last_pending_account_changes lpac where lpac.id < 0
        union all
        select 
            cac.id,
            cac.group_id,
            cac.type,
            coalesce(lpac.name, cac.name) as name,
            coalesce(lpac.description, cac.description) as description,
            coalesce(lpac.owning_user_id, cac.owning_user_id) as owning_user_id,
            coalesce(lpac.clearing_shares, cac.clearing_shares) as clearing_shares,
            coalesce(lpac.deleted, cac.deleted) as deleted,
            coalesce(lpac.has_unpublished_changes, cac.has_unpublished_changes) as has_unpublished_changes,
            coalesce(lpac.has_local_changes, false) as has_local_changes,
            coalesce(lpac.last_changed, cac.last_changed) as last_changed
        from committed_account_changes cac left join last_pending_account_changes lpac on cac.id = lpac.id`,

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
        type                     text                not null,
        
        last_changed             text                not null,
        has_unpublished_changes  boolean             not null
    )`,

    `create table if not exists transaction_history (
        id                       integer primary key not null references "transaction" (id) on delete cascade,

        description              text                not null,
        value                    real                not null,
        billed_at                text                not null,
        currency_conversion_rate real                not null,
        currency_symbol          text                not null,
        creditor_shares          text                not null,
        debitor_shares           text                not null,
        deleted                  boolean             not null
    )`,

    `create table if not exists pending_transaction_changes (
        id                       integer               not null references "transaction" (id) on delete cascade,
        change_id                integer primary key autoincrement not null,
        change_time              text                  not null,

        description              text                  not null,
        value                    real                  not null,
        billed_at                text                  not null,
        currency_conversion_rate real                  not null,
        currency_symbol          text                  not null,
        creditor_shares          text                  not null,
        debitor_shares           text                  not null,
        deleted                  boolean               not null
    )`,

    `create view if not exists last_pending_transaction_changes as
        select 
            id,
            group_id,
            type,
            description,
            value,
            billed_at,
            currency_conversion_rate,
            currency_symbol,
            creditor_shares,
            debitor_shares,
            deleted,
            true as has_unpublished_changes,
            true as has_local_changes,
            change_time as last_changed
        from
            (
                select
                    row_number() over (partition by t.group_id, ptc.id order by ptc.change_id desc) as rank,
                    *
                from
                    "transaction" t join pending_transaction_changes ptc on t.id = ptc.id
                group by t.group_id
            ) sub
        where
            sub.rank = 1`,

    `create view if not exists committed_transaction_changes as
        select *
        from transaction_history th join "transaction" t on t.id = th.id`,

    `create view if not exists transactions_including_pending_changes as
        select
            lptc.id,
            lptc.group_id,
            lptc.type,
            lptc.description,
            lptc.value,
            lptc.billed_at,
            lptc.currency_conversion_rate,
            lptc.currency_symbol,
            lptc.creditor_shares,
            lptc.debitor_shares,
            lptc.deleted,
            lptc.has_unpublished_changes,
            lptc.has_local_changes,
            lptc.last_changed
        from last_pending_transaction_changes lptc where lptc.id < 0
        union all
        select 
            ctc.id,
            ctc.group_id,
            ctc.type,
            coalesce(lptc.description, ctc.description) as description,
            coalesce(lptc.value, ctc.value) as value,
            coalesce(lptc.billed_at, ctc.billed_at) as billed_at,
            coalesce(lptc.currency_conversion_rate, ctc.currency_conversion_rate) as currency_conversion_rate,
            coalesce(lptc.currency_symbol, ctc.currency_symbol) as currency_symbol,
            coalesce(lptc.creditor_shares, ctc.creditor_shares) as creditor_shares,
            coalesce(lptc.debitor_shares, ctc.debitor_shares) as debitor_shares,
            coalesce(lptc.deleted, ctc.deleted) as deleted,
            coalesce(lptc.has_unpublished_changes, ctc.has_unpublished_changes) as has_unpublishec_changes,
            coalesce(lptc.has_local_changes, false) as has_local_changes,
            coalesce(lptc.last_changed, ctc.last_changed) as last_changed
        from committed_transaction_changes ctc left join last_pending_transaction_changes lptc on ctc.id = lptc.id`,

    `create table if not exists transaction_position (
        id               integer primary key not null,
        transaction_id   integer             not null references "transaction" (id) on delete cascade
    )`,

    `create table if not exists transaction_position_history (
        id               integer primary key not null references transaction_position (id) on delete cascade,

        name             text                not null,
        price            real                not null,
        communist_shares real                not null,
        usages           text                not null,
        deleted          boolean             not null
    )`,

    `create table if not exists pending_transaction_position_changes (
        id               integer               not null references transaction_position (id) on delete cascade,
        change_id        integer primary key autoincrement not null,
        change_time      text                  not null,

        name             text                  not null,
        price            real                  not null,
        communist_shares real                  not null,
        usages           text                  not null,
        deleted          boolean               not null
    )`,

    `create view if not exists last_pending_transaction_position_changes as
        select 
            id,
            transaction_id,
            name,
            price,
            communist_shares,
            usages,
            deleted
        from
            (
                select
                    row_number() over (partition by t.transaction_id, ptc.id order by ptc.change_id desc) as rank,
                    *
                from
                    transaction_position t join pending_transaction_position_changes ptc on t.id = ptc.id
                group by t.transaction_id
            ) sub
        where
            sub.rank = 1`,

    `create view if not exists committed_transaction_position_changes as
        select * from transaction_position_history th join transaction_position t on t.id = th.id`,

    `create view if not exists transaction_positions_including_pending_changes as
        select
            lptc.id,
            lptc.transaction_id,
            lptc.name,
            lptc.price,
            lptc.communist_shares,
            lptc.usages,
            lptc.deleted
        from last_pending_transaction_position_changes lptc where lptc.id < 0
        union all
        select 
            ctc.id,
            ctc.transaction_id,
            coalesce(lptc.name, ctc.name) as name,
            coalesce(lptc.price, ctc.price) as price,
            coalesce(lptc.communist_shares, ctc.communist_shares) as communist_shares,
            coalesce(lptc.usages, ctc.usages) as usages,
            coalesce(lptc.deleted, ctc.deleted) as deleted
        from committed_transaction_position_changes ctc left join last_pending_transaction_position_changes lptc on ctc.id = lptc.id`,
];
