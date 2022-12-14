-- revision: ee5d2b35
-- requires: 174ef0fc

drop view aggregated_committed_account_history;
drop function committed_account_state_valid_at;
drop view aggregated_pending_account_history;
drop function full_account_state_valid_at;

drop view aggregated_committed_file_history;
drop view aggregated_committed_transaction_position_history;
drop view aggregated_committed_transaction_history;
drop view aggregated_pending_file_history;
drop view aggregated_pending_transaction_position_history;
drop view aggregated_pending_transaction_history;
drop function committed_transaction_state_valid_at;
drop function committed_file_state_valid_at;
drop function committed_transaction_position_state_valid_at;
drop function full_transaction_state_valid_at;

create or replace function update_last_changed() returns trigger as
$$
begin
    NEW.last_changed = now();
    return NEW;
end;
$$ language plpgsql;

create or replace function update_related_transaction_last_changed() returns trigger as
$$
begin
    update transaction_revision set last_changed = now() where id = NEW.revision_id;
    return null;
end;
$$ language plpgsql;

create or replace function update_related_account_last_changed() returns trigger as
$$
begin
    update account_revision set last_changed = now() where id = NEW.revision_id;
    return null;
end;
$$ language plpgsql;

alter table account_revision
    add column last_changed timestamptz;
update account_revision
set
    last_changed = coalesce(committed, started);
alter table account_revision
    alter column last_changed set not null;
alter table account_revision
    alter column last_changed set default now();

drop trigger if exists account_revision_last_change_update_trig on account_revision;
create trigger account_revision_last_change_update_trig
    after insert or update
    on account_revision
    for each row
execute function update_last_changed();

alter table transaction_revision
    add column last_changed timestamptz;
update transaction_revision
set
    last_changed = coalesce(committed, started);
alter table transaction_revision
    alter column last_changed set not null;
alter table transaction_revision
    alter column last_changed set default now();

drop trigger if exists transaction_revision_last_change_update_trig on transaction_revision;
create trigger transaction_revision_last_change_update_trig
    after insert or update
    on transaction_revision
    for each row
execute function update_last_changed();

drop trigger if exists transaction_history_last_changed_update_trig on transaction_history;
create trigger transaction_history_last_changed_update_trig
    after insert or update
    on transaction_history
    for each row
execute function update_related_transaction_last_changed();

drop trigger if exists purchase_item_last_changed_update_trig on purchase_item_history;
create trigger purchase_item_last_changed_update_trig
    after insert or update
    on purchase_item_history
    for each row
execute function update_related_transaction_last_changed();

drop trigger if exists account_last_changed_update_trig on account_history;
create trigger account_last_changed_update_trig
    after insert or update
    on account_history
    for each row
execute function update_related_account_last_changed();

create table tag (
    id       serial primary key,
    group_id integer      not null references grp (id),
    name     varchar(255) not null,
    unique (group_id, name)
);

create table transaction_to_tag (
    transaction_id integer not null references transaction (id),
    revision_id    bigint  not null references transaction_revision (id),
    tag_id         integer not null references tag (id),
    primary key (transaction_id, revision_id, tag_id)
);

create view transaction_tags (transaction_id, revision_id, tag_names) as
    SELECT
        ttt.transaction_id,
        ttt.revision_id,
        array_agg(tag.name) AS tag_names
    FROM
        transaction_to_tag ttt
        join tag on ttt.tag_id = tag.id
    GROUP BY
        ttt.transaction_id, ttt.revision_id;

alter table transaction_history
    rename column description to name;
alter table transaction_history
    add column description text;

alter table account_history
    drop column priority;

alter table account_history
    add column date_info date;


create table account_to_tag (
    account_id  integer not null references account (id),
    revision_id bigint  not null references account_revision (id),
    tag_id      integer not null references tag (id),
    primary key (account_id, revision_id, tag_id)
);

create or replace view account_tags (account_id, revision_id, tag_names) as
    SELECT
        att.account_id,
        att.revision_id,
        array_agg(tag.name) AS tag_names
    FROM
        account_to_tag att
        join tag on att.tag_id = tag.id
    GROUP BY
        att.account_id, att.revision_id;

create or replace function check_committed_accounts(
    revision_id bigint, account_id integer, started timestamp with time zone, committed timestamp with time zone
) returns boolean
    language plpgsql as
$$
<<locals>> declare
    n_tags            int;
    n_clearing_shares int;
    group_id          int;
    account_type      text;
    date_info         date;
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

    select
        a.type,
        a.group_id
    into locals.account_type, locals.group_id
    from
        account a
    where
        a.id = check_committed_accounts.account_id;

    select
        count(cas.share_account_id)
    into locals.n_clearing_shares
    from
        clearing_account_share cas
    where
        cas.account_id = check_committed_accounts.account_id
        and cas.revision_id = check_committed_accounts.revision_id;

    select
        count(*)
    into locals.n_tags
    from
        account_to_tag att
    where
        att.account_id = check_committed_accounts.account_id
        and att.revision_id = check_committed_accounts.revision_id;

    select
        ah.date_info
    into locals.date_info
    from
        account_history ah
    where
        ah.id = check_committed_accounts.account_id
        and ah.revision_id = check_committed_accounts.revision_id;

    if found then
        if locals.date_info is null and locals.account_type = 'clearing' then
            raise '"clearing" type accounts must have a date set';
        end if;
    end if;

    if locals.account_type = 'personal' then
        if locals.n_clearing_shares != 0 then
            raise '"personal" type accounts cannot have associated settlement distribution shares';
        end if;
        if locals.n_tags != 0 then raise '"personal" type accounts cannot have tags'; end if;
    end if;

    return true;
end
$$;

create or replace view aggregated_committed_account_history as
    (
    select
        sub.revision_id,
        sub.account_id,
        sub.user_id,
        sub.group_id,
        sub.type,
        sub.started                                          as revision_started,
        sub.committed                                        as revision_committed,
        sub.last_changed                                     as last_changed,
        first_value(sub.description) over outer_window       as description,
        first_value(sub.name) over outer_window              as name,
        first_value(sub.owning_user_id) over outer_window    as owning_user_id,
        first_value(sub.date_info) over outer_window         as date_info,
        first_value(sub.deleted) over outer_window           as deleted,
        first_value(sub.n_clearing_shares) over outer_window as n_clearing_shares,
        first_value(sub.clearing_shares) over outer_window   as clearing_shares,
        first_value(sub.involved_accounts) over outer_window as involved_accounts,
        first_value(sub.tags) over outer_window              as tags
    from
        (
            select
                ar.id                                            as revision_id,
                ar.account_id,
                ar.user_id,
                ar.started,
                ar.committed,
                ar.last_changed,
                a.group_id,
                a.type,
                count(a.id) over wnd                             as id_partition,
                ah.name,
                ah.description,
                ah.owning_user_id,
                ah.date_info,
                ah.deleted,
                coalesce(cas.n_shares, 0)                        as n_clearing_shares,
                coalesce(cas.shares, '[]'::jsonb)                as clearing_shares,
                coalesce(cas.involved_accounts, array []::int[]) as involved_accounts,
                coalesce(t.tag_names, array []::varchar(255)[])  as tags
            from
                account_revision ar
                join account a on a.id = ar.account_id
                left join account_history ah on ah.id = a.id and ar.id = ah.revision_id
                left join clearing_account_shares_as_json cas on a.id = cas.account_id and ar.id = cas.revision_id
                left join account_tags t on a.id = t.account_id and ar.id = t.revision_id
            where
                ar.committed is not null window wnd as (partition by a.id order by committed asc)
        ) as sub window outer_window as (partition by sub.account_id, sub.id_partition order by sub.revision_id) );

create or replace function committed_account_state_valid_at(
    valid_at timestamptz = now()
)
    returns table (
        account_id         int,
        revision_id        bigint,
        type               text,
        changed_by         int,
        group_id           int,
        revision_started   timestamptz,
        revision_committed timestamptz,
        last_changed       timestamptz,
        name               text,
        description        text,
        owning_user_id     int,
        date_info          date,
        deleted            bool,
        n_clearing_shares  int,
        clearing_shares    jsonb,
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
    acah.revision_started,
    acah.revision_committed,
    acah.last_changed,
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
    aggregated_committed_account_history acah
where
    acah.revision_committed <= committed_account_state_valid_at.valid_at
order by
    acah.account_id, acah.revision_committed desc
$$ language sql
    security invoker
    stable;


create or replace view aggregated_pending_account_history as
    (
    select
        ar.account_id,
        ar.id                                            as revision_id,
        ar.user_id                                       as changed_by,
        ar.started                                       as revision_started,
        ar.last_changed                                  as last_changed,
        a.group_id,
        a.type,
        ah.name,
        ah.description,
        ah.owning_user_id,
        ah.date_info,
        ah.deleted,
        coalesce(cas.n_shares, 0)                        as n_clearing_shares,
        coalesce(cas.shares, '[]'::jsonb)                as clearing_shares,
        coalesce(cas.involved_accounts, array []::int[]) as involved_accounts,
        coalesce(t.tag_names, array []::varchar(255)[])  as tags
    from
        account_revision ar
        join account a on ar.account_id = a.id
        join account_history ah on a.id = ah.id and ar.id = ah.revision_id
        left join clearing_account_shares_as_json cas on a.id = cas.account_id and ar.id = cas.revision_id
        left join account_tags t on a.id = t.account_id and ar.id = t.revision_id
    where
        ar.committed is null );

create or replace function full_account_state_valid_at(
    seen_by_user integer, valid_at timestamp with time zone DEFAULT now()
)
    returns TABLE (
        account_id        integer,
        type              text,
        group_id          integer,
        last_changed      timestamptz,
        is_wip            boolean,
        committed_details jsonb,
        pending_details   jsonb
    )
    stable
    language sql
as
$$
select
    a.id                                                                   as account_id,
    a.type,
    a.group_id,
    greatest(committed_details.last_changed, pending_details.last_changed) as last_changed,
    exists(select
               1
           from
               account_revision ar
           where
               ar.account_id = a.id
               and ar.user_id = full_account_state_valid_at.seen_by_user
               and ar.committed is null)                                   as is_wip,
    committed_details.json_state                                           as committed_details,
    pending_details.json_state                                             as pending_details
from
    account a
    left join (
        select
            casa.account_id,
            jsonb_agg(casa)        as json_state,
            max(casa.last_changed) as last_changed
        from
            committed_account_state_valid_at(full_account_state_valid_at.valid_at) casa
        group by casa.account_id
              ) committed_details on a.id = committed_details.account_id
    left join (
        select
            apah.account_id,
            jsonb_agg(apah)        as json_state,
            max(apah.last_changed) as last_changed
        from
            aggregated_pending_account_history apah
        where
            apah.changed_by = full_account_state_valid_at.seen_by_user
        group by apah.account_id
              ) pending_details on a.id = pending_details.account_id
where
    committed_details.json_state is not null
    or pending_details.json_state is not null
$$;

create or replace view aggregated_pending_transaction_position_history as
    SELECT
        tr.id                                                AS revision_id,
        tr.transaction_id,
        tr.user_id                                           AS changed_by,
        tr.started                                           AS revision_started,
        tr.last_changed                                      AS last_changed,
        pi.id                                                AS item_id,
        pih.name,
        pih.price,
        pih.communist_shares,
        pih.deleted,
        coalesce(piu.n_usages, 0::double precision)          AS n_usages,
        coalesce(piu.usages, '[]'::jsonb)                    AS usages,
        coalesce(piu.involved_accounts, array []::integer[]) AS involved_accounts
    FROM
        transaction_revision tr
        JOIN purchase_item pi ON tr.transaction_id = pi.transaction_id
        JOIN purchase_item_history pih ON pih.id = pi.id AND tr.id = pih.revision_id
        LEFT JOIN purchase_item_usages_as_json piu ON pi.id = piu.item_id AND tr.id = piu.revision_id
    WHERE
        tr.committed IS NULL;

create or replace view aggregated_pending_transaction_history as
    SELECT
        tr.id                                                 AS revision_id,
        tr.transaction_id,
        tr.user_id                                            AS changed_by,
        tr.started                                            AS revision_started,
        tr.last_changed                                       AS last_changed,
        t.group_id,
        t.type,
        th.value,
        th.currency_symbol,
        th.currency_conversion_rate,
        th.name,
        th.description,
        th.billed_at,
        th.deleted,
        coalesce(csaj.n_shares, 0::double precision)          AS n_creditor_shares,
        coalesce(csaj.shares, '[]'::jsonb)                    AS creditor_shares,
        coalesce(dsaj.n_shares, 0::double precision)          AS n_debitor_shares,
        coalesce(dsaj.shares, '[]'::jsonb)                    AS debitor_shares,
        coalesce(dsaj.involved_accounts, ARRAY []::integer[]) AS involved_accounts,
        coalesce(tt.tag_names, array []::varchar(255)[])      as tags
    FROM
        transaction_revision tr
        JOIN transaction t ON tr.transaction_id = t.id
        JOIN transaction_history th ON t.id = th.id AND tr.id = th.revision_id
        LEFT JOIN creditor_shares_as_json csaj ON t.id = csaj.transaction_id AND tr.id = csaj.revision_id
        LEFT JOIN debitor_shares_as_json dsaj ON t.id = dsaj.transaction_id AND tr.id = dsaj.revision_id
        left join transaction_tags tt on tt.transaction_id = t.id and tt.revision_id = tr.id
    WHERE
        tr.committed IS NULL;

create or replace view aggregated_pending_file_history as
    SELECT
        tr.id           AS revision_id,
        tr.transaction_id,
        tr.user_id      AS changed_by,
        tr.started      AS revision_started,
        tr.last_changed AS last_changed,
        f.id            AS file_id,
        fh.filename,
        blob.mime_type,
        fh.blob_id,
        fh.deleted
    FROM
        transaction_revision tr
        JOIN file f ON tr.transaction_id = f.transaction_id
        JOIN file_history fh ON fh.id = f.id AND tr.id = fh.revision_id
        LEFT JOIN blob ON blob.id = fh.blob_id
    WHERE
        tr.committed IS NULL;

create or replace view aggregated_committed_transaction_position_history as
    SELECT
        sub.revision_id,
        sub.transaction_id,
        sub.item_id,
        sub.user_id,
        sub.started                                          AS revision_started,
        sub.committed                                        AS revision_committed,
        sub.last_changed                                     AS last_changed,
        first_value(sub.name) OVER outer_window              AS name,
        first_value(sub.price) OVER outer_window             AS price,
        first_value(sub.communist_shares) OVER outer_window  AS communist_shares,
        first_value(sub.deleted) OVER outer_window           AS deleted,
        first_value(sub.n_usages) OVER outer_window          AS n_usages,
        first_value(sub.usages) OVER outer_window            AS usages,
        first_value(sub.involved_accounts) OVER outer_window AS involved_accounts
    FROM
        (
            SELECT
                tr.id                                                AS revision_id,
                tr.transaction_id,
                tr.user_id,
                tr.started,
                tr.committed,
                tr.last_changed,
                pi.id                                                AS item_id,
                count(pi.id) OVER wnd                                AS id_partition,
                pih.name,
                pih.price,
                pih.communist_shares,
                pih.deleted,
                COALESCE(piu.n_usages, 0::double precision)          AS n_usages,
                COALESCE(piu.usages, '[]'::jsonb)                    AS usages,
                COALESCE(piu.involved_accounts, ARRAY []::integer[]) AS involved_accounts
            FROM
                transaction_revision tr
                JOIN purchase_item pi ON tr.transaction_id = pi.transaction_id
                LEFT JOIN purchase_item_history pih ON pih.id = pi.id AND tr.id = pih.revision_id
                LEFT JOIN purchase_item_usages_as_json piu ON pi.id = piu.item_id AND tr.id = piu.revision_id
            WHERE
                tr.committed IS NOT NULL WINDOW wnd AS (PARTITION BY pi.id ORDER BY tr.committed)
        ) sub WINDOW outer_window AS (PARTITION BY sub.item_id, sub.id_partition ORDER BY sub.revision_id);

create or replace view aggregated_committed_transaction_history as
    SELECT
        sub.revision_id,
        sub.transaction_id,
        sub.user_id,
        sub.group_id,
        sub.started                                                 AS revision_started,
        sub.committed                                               AS revision_committed,
        sub.last_changed                                            AS last_changed,
        sub.type,
        first_value(sub.value) OVER outer_window                    AS value,
        first_value(sub.name) OVER outer_window                     AS name,
        first_value(sub.description) OVER outer_window              AS description,
        first_value(sub.currency_symbol) OVER outer_window          AS currency_symbol,
        first_value(sub.currency_conversion_rate) OVER outer_window AS currency_conversion_rate,
        first_value(sub.billed_at) OVER outer_window                AS billed_at,
        first_value(sub.deleted) OVER outer_window                  AS deleted,
        first_value(sub.n_creditor_shares) OVER outer_window        AS n_creditor_shares,
        first_value(sub.creditor_shares) OVER outer_window          AS creditor_shares,
        first_value(sub.n_debitor_shares) OVER outer_window         AS n_debitor_shares,
        first_value(sub.debitor_shares) OVER outer_window           AS debitor_shares,
        first_value(sub.involved_accounts) OVER outer_window        AS involved_accounts,
        first_value(sub.tags) over outer_window                     as tags
    FROM
        (
            SELECT
                tr.id                                                 AS revision_id,
                tr.transaction_id,
                tr.user_id,
                tr.started,
                tr.committed,
                tr.last_changed,
                t.group_id,
                t.type,
                count(th.id) OVER wnd                                 AS id_partition,
                th.value,
                th.currency_symbol,
                th.currency_conversion_rate,
                th.name,
                th.description,
                th.billed_at,
                th.deleted,
                COALESCE(csaj.n_shares, 0::double precision)          AS n_creditor_shares,
                COALESCE(csaj.shares, '[]'::jsonb)                    AS creditor_shares,
                COALESCE(dsaj.n_shares, 0::double precision)          AS n_debitor_shares,
                COALESCE(dsaj.shares, '[]'::jsonb)                    AS debitor_shares,
                COALESCE(dsaj.involved_accounts, ARRAY []::integer[]) AS involved_accounts,
                coalesce(tt.tag_names, array []::varchar(255)[])      as tags
            FROM
                transaction_revision tr
                JOIN transaction t ON tr.transaction_id = t.id
                LEFT JOIN transaction_history th ON t.id = th.id AND tr.id = th.revision_id
                LEFT JOIN creditor_shares_as_json csaj ON t.id = csaj.transaction_id AND tr.id = csaj.revision_id
                LEFT JOIN debitor_shares_as_json dsaj ON t.id = dsaj.transaction_id AND tr.id = dsaj.revision_id
                left join transaction_tags tt on tt.transaction_id = t.id and tt.revision_id = tr.id
            WHERE
                tr.committed IS NOT NULL WINDOW wnd AS (PARTITION BY tr.transaction_id ORDER BY tr.committed)
        ) sub WINDOW outer_window AS (PARTITION BY sub.transaction_id, sub.id_partition ORDER BY sub.revision_id);

create or replace view aggregated_committed_file_history as
    SELECT
        sub.revision_id,
        sub.transaction_id,
        sub.file_id,
        sub.user_id,
        sub.started                                  AS revision_started,
        sub.committed                                AS revision_committed,
        sub.last_changed                             AS last_changed,
        first_value(sub.filename) OVER outer_window  AS filename,
        first_value(sub.mime_type) OVER outer_window AS mime_type,
        first_value(sub.blob_id) OVER outer_window   AS blob_id,
        first_value(sub.deleted) OVER outer_window   AS deleted
    FROM
        (
            SELECT
                tr.id                AS revision_id,
                tr.transaction_id,
                tr.user_id,
                tr.started,
                tr.committed,
                tr.last_changed,
                f.id                 AS file_id,
                count(f.id) OVER wnd AS id_partition,
                fh.filename,
                blob.mime_type,
                fh.blob_id,
                fh.deleted
            FROM
                transaction_revision tr
                JOIN file f ON tr.transaction_id = f.transaction_id
                LEFT JOIN file_history fh ON fh.id = f.id AND tr.id = fh.revision_id
                LEFT JOIN blob ON blob.id = fh.blob_id
            WHERE
                tr.committed IS NOT NULL WINDOW wnd AS (PARTITION BY f.id ORDER BY tr.committed)
        ) sub WINDOW outer_window AS (PARTITION BY sub.file_id, sub.id_partition ORDER BY sub.revision_id);

create or replace function committed_file_state_valid_at(
    valid_at timestamp with time zone DEFAULT now()
)
    returns TABLE (
        file_id            integer,
        revision_id        bigint,
        transaction_id     integer,
        changed_by         integer,
        revision_started   timestamptz,
        revision_committed timestamptz,
        last_changed       timestamptz,
        filename           text,
        mime_type          text,
        blob_id            integer,
        deleted            boolean
    )
    stable
    language sql
as
$$
select distinct on (file_id)
    file_id,
    revision_id,
    transaction_id,
    user_id as changed_by,
    revision_started,
    revision_committed,
    last_changed,
    filename,
    mime_type,
    blob_id,
    deleted
from
    aggregated_committed_file_history
where
    revision_committed <= committed_file_state_valid_at.valid_at
    and filename is not null
order by
    file_id, revision_committed desc
$$;

create or replace function committed_transaction_position_state_valid_at(
    valid_at timestamp with time zone DEFAULT now()
)
    returns TABLE (
        item_id            integer,
        revision_id        bigint,
        transaction_id     integer,
        changed_by         integer,
        revision_started   timestamptz,
        revision_committed timestamptz,
        last_changed       timestamptz,
        name               text,
        price              double precision,
        communist_shares   double precision,
        deleted            boolean,
        n_usages           integer,
        usages             jsonb,
        involved_accounts  integer[]
    )
    stable
    language sql
as
$$
select distinct on (acph.item_id)
    acph.item_id,
    acph.revision_id,
    acph.transaction_id,
    acph.user_id as changed_by,
    acph.revision_started,
    acph.revision_committed,
    acph.last_changed,
    acph.name,
    acph.price,
    acph.communist_shares,
    acph.deleted,
    acph.n_usages,
    acph.usages,
    acph.involved_accounts
from
    aggregated_committed_transaction_position_history acph
where
        acph.revision_committed <= committed_transaction_position_state_valid_at.valid_at
    and acph.name is not null
order by
    acph.item_id, acph.revision_committed desc
$$;

create or replace function committed_transaction_state_valid_at(
    valid_at timestamp with time zone DEFAULT now()
)
    returns TABLE (
        revision_id              bigint,
        transaction_id           integer,
        changed_by               integer,
        revision_started         timestamptz,
        revision_committed       timestamptz,
        last_changed             timestamptz,
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
        creditor_shares          jsonb,
        n_debitor_shares         integer,
        debitor_shares           jsonb,
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
    acth.revision_started,
    acth.revision_committed,
    acth.last_changed,
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
    aggregated_committed_transaction_history acth
where
        acth.revision_committed <= committed_transaction_state_valid_at.valid_at
order by
    acth.transaction_id, acth.revision_committed desc
$$;

create or replace function full_transaction_state_valid_at(
    seen_by_user integer, valid_at timestamp with time zone DEFAULT now()
)
    returns TABLE (
        transaction_id      integer,
        type                text,
        group_id            integer,
        last_changed        timestamp with time zone,
        is_wip              boolean,
        committed_details   jsonb,
        pending_details     jsonb,
        committed_positions jsonb,
        pending_positions   jsonb,
        committed_files     jsonb,
        pending_files       jsonb
    )
    stable
    language sql
as
$$
select
    t.id                                                                                               as transaction_id,
    t.type,
    t.group_id,
    greatest(committed_details.last_changed, committed_positions.last_changed, committed_files.last_changed,
             pending_details.last_changed, pending_positions.last_changed, pending_files.last_changed) as last_changed,
    exists(select
               1
           from
               transaction_revision tr
           where
               tr.transaction_id = t.id
               and tr.user_id = full_transaction_state_valid_at.seen_by_user
               and tr.committed is null)                                                               as is_wip,
    committed_details.json_state                                                                       as committed_details,
    pending_details.json_state                                                                         as pending_details,
    committed_positions.json_state                                                                     as committed_positions,
    pending_positions.json_state                                                                       as pending_positions,
    committed_files.json_state                                                                         as committed_files,
    pending_files.json_state                                                                           as pending_files
from
    transaction t
    left join (
        select
            ctsa.transaction_id,
            jsonb_agg(ctsa)        as json_state,
            max(ctsa.last_changed) as last_changed
        from
            committed_transaction_state_valid_at(full_transaction_state_valid_at.valid_at) ctsa
        group by ctsa.transaction_id
              ) committed_details on t.id = committed_details.transaction_id
    left join (
        select
            apth.transaction_id,
            jsonb_agg(apth)        as json_state,
            max(apth.last_changed) as last_changed
        from
            aggregated_pending_transaction_history apth
        where
            apth.changed_by = full_transaction_state_valid_at.seen_by_user
        group by apth.transaction_id
              ) pending_details on t.id = pending_details.transaction_id
    left join (
        select
            ctpsa.transaction_id,
            jsonb_agg(ctpsa)        as json_state,
            max(ctpsa.last_changed) as last_changed
        from
            committed_transaction_position_state_valid_at(full_transaction_state_valid_at.valid_at) ctpsa
        group by ctpsa.transaction_id
              ) committed_positions on t.id = committed_positions.transaction_id
    left join (
        select
            aptph.transaction_id,
            jsonb_agg(aptph)        as json_state,
            max(aptph.last_changed) as last_changed
        from
            aggregated_pending_transaction_position_history aptph
        where
            aptph.changed_by = full_transaction_state_valid_at.seen_by_user
        group by aptph.transaction_id
              ) pending_positions on t.id = pending_positions.transaction_id
    left join (
        select
            cfsva.transaction_id,
            jsonb_agg(cfsva)        as json_state,
            max(cfsva.last_changed) as last_changed
        from
            committed_file_state_valid_at(full_transaction_state_valid_at.valid_at) cfsva
        group by cfsva.transaction_id
              ) committed_files on t.id = committed_files.transaction_id
    left join (
        select
            apfh.transaction_id,
            jsonb_agg(apfh)        as json_state,
            max(apfh.last_changed) as last_changed
        from
            aggregated_pending_file_history apfh
        where
            apfh.changed_by = full_transaction_state_valid_at.seen_by_user
        group by apfh.transaction_id
              ) pending_files on t.id = pending_files.transaction_id
where
    committed_details.json_state is not null
    or pending_details.json_state is not null
$$;
