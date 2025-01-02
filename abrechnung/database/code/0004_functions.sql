create or replace function account_state_valid_at(
    valid_at timestamptz = now()
)
    returns table (
        account_id         int,
        revision_id        bigint,
        type               text,
        changed_by         int,
        group_id           int,
        created_at         timestamptz,
        name               text,
        description        text,
        owning_user_id     int,
        date_info          date,
        deleted            bool,
        n_clearing_shares  int,
        clearing_shares    json,
        involved_accounts  int[],
        tags               varchar(255)[]
    )
as
$$
select distinct on (acah.account_id)
    acah.account_id,
    acah.revision_id,
    acah.type,
    acah.user_id,
    acah.group_id,
    acah.created_at,
    acah.name,
    acah.description,
    acah.owning_user_id,
    acah.date_info,
    acah.deleted,
    acah.n_clearing_shares,
    acah.clearing_shares,
    acah.involved_accounts,
    acah.tags
from
    aggregated_account_history acah
where
    acah.created_at <= account_state_valid_at.valid_at
order by
    acah.account_id, acah.created_at desc
$$ language sql
    security invoker
    stable;

create or replace function full_account_state_valid_at(
    valid_at timestamp with time zone default now()
)
    returns table (
        id                integer,
        type              text,
        group_id          integer,
        last_changed      timestamptz,
        changed_by        int,
        name              text,
        description       text,
        owning_user_id    int,
        date_info         date,
        deleted           bool,
        n_clearing_shares int,
        clearing_shares   json,
        involved_accounts int[],
        tags              varchar(255)[]
    )
    stable
    language sql
as
$$
select
    a.id,
    a.type,
    a.group_id,
    details.created_at as last_changed,
    details.changed_by,
    details.name,
    details.description,
    details.owning_user_id,
    details.date_info,
    details.deleted,
    details.n_clearing_shares,
    details.clearing_shares,
    details.involved_accounts,
    details.tags
from
    account a
    join account_state_valid_at(full_account_state_valid_at.valid_at) details on a.id = details.account_id
$$;

create or replace function file_state_valid_at(
    valid_at timestamp with time zone default now()
)
    returns table (
        id                  integer,
        revision_id         bigint,
        transaction_id      integer,
        changed_by          integer,
        created_at timestamptz,
        filename            text,
        mime_type           text,
        blob_id             integer,
        deleted             boolean
    )
    stable
    language sql
as
$$
select distinct on (id)
    id,
    revision_id,
    transaction_id,
    user_id as changed_by,
    created_at,
    filename,
    mime_type,
    blob_id,
    deleted
from
    aggregated_file_history
where
    created_at <= file_state_valid_at.valid_at
        and filename is not null
order by
    id, created_at desc
$$;

create or replace function transaction_position_state_valid_at(
    valid_at timestamp with time zone default now()
)
    returns table (
        id                      integer,
        revision_id             bigint,
        transaction_id          integer,
        changed_by              integer,
        created_at     timestamptz,
        name                    text,
        price                   double precision,
        communist_shares        double precision,
        deleted                 boolean,
        n_usages                integer,
        usages                  json,
        involved_accounts       integer[]
    )
    stable
    language sql
as
$$
select distinct on (acph.item_id)
    acph.item_id as id,
    acph.revision_id,
    acph.transaction_id,
    acph.user_id as changed_by,
    acph.created_at,
    acph.name,
    acph.price,
    acph.communist_shares,
    acph.deleted,
    acph.n_usages,
    acph.usages,
    acph.involved_accounts
from
    aggregated_transaction_position_history acph
where
    acph.created_at <= transaction_position_state_valid_at.valid_at
        and acph.name is not null
order by
    acph.item_id, acph.created_at desc
$$;

create or replace function transaction_state_valid_at(
    valid_at timestamp with time zone default now()
)
    returns table (
        revision_id              bigint,
        transaction_id           integer,
        changed_by               integer,
        created_at      timestamptz,
        group_id                 integer,
        type                     text,
        value                    double precision,
        currency_symbol          text,
        currency_conversion_rate double precision,
        name                     text,
        description              text,
        billed_at                date,
        deleted                  boolean,
        n_creditor_shares        integer,
        creditor_shares          json,
        n_debitor_shares         integer,
        debitor_shares           json,
        involved_accounts        integer[],
        tags                     varchar(255)[]
    )
    stable
    language sql
as
$$
select distinct on (acth.transaction_id)
    acth.revision_id,
    acth.transaction_id,
    acth.user_id as changed_by,
    acth.created_at,
    acth.group_id,
    acth.type,
    acth.value,
    acth.currency_symbol,
    acth.currency_conversion_rate,
    acth.name,
    acth.description,
    acth.billed_at,
    acth.deleted,
    acth.n_creditor_shares,
    acth.creditor_shares,
    acth.n_debitor_shares,
    acth.debitor_shares,
    acth.involved_accounts,
    acth.tags
from
    aggregated_transaction_history acth
where
    acth.created_at <= transaction_state_valid_at.valid_at
order by
    acth.transaction_id, acth.created_at desc
$$;

create or replace function full_transaction_state_valid_at(
    valid_at timestamp with time zone default now()
)
    returns table (
        id                          integer,
        type                        text,
        group_id                    integer,
        last_changed                timestamp with time zone,
        value                       double precision,
        currency_symbol             text,
        currency_conversion_rate    double precision,
        name                        text,
        description                 text,
        billed_at                   date,
        deleted                     boolean,
        n_creditor_shares           integer,
        creditor_shares             json,
        n_debitor_shares            integer,
        debitor_shares              json,
        involved_accounts           integer[],
        tags                        varchar(255)[],
        positions                   json,
        files                       json
    )
    stable
    language sql
as
$$
select
    t.id,
    t.type,
    t.group_id,
    greatest(
        details.created_at,
        aggregated_positions.created_at,
        aggregated_files.created_at
    ) as last_changed,
    details.value,
    details.currency_symbol,
    details.currency_conversion_rate,
    details.name,
    details.description,
    details.billed_at,
    details.deleted,
    details.n_creditor_shares,
    details.creditor_shares,
    details.n_debitor_shares,
    details.debitor_shares,
    details.involved_accounts,
    details.tags,
    coalesce(aggregated_positions.json_state, '[]'::json)    as positions,
    coalesce(aggregated_files.json_state, '[]'::json)        as files
from
    transaction t
    join
        transaction_state_valid_at(full_transaction_state_valid_at.valid_at) details on t.id = details.transaction_id
    left join (
        select
            ctpsa.transaction_id,
            json_agg(ctpsa)        as json_state,
            max(ctpsa.created_at) as created_at
        from
            transaction_position_state_valid_at(full_transaction_state_valid_at.valid_at) ctpsa
        group by ctpsa.transaction_id
    ) aggregated_positions on t.id = aggregated_positions.transaction_id
    left join (
        select
            cfsva.transaction_id,
            json_agg(cfsva)        as json_state,
            max(cfsva.created_at) as created_at
        from
            file_state_valid_at(full_transaction_state_valid_at.valid_at) cfsva
        group by cfsva.transaction_id
    ) aggregated_files on t.id = aggregated_files.transaction_id
$$;
