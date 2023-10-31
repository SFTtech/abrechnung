create view clearing_account_shares_as_json(revision_id, account_id, n_shares, involved_accounts, shares) as
    SELECT
        cas.revision_id,
        cas.account_id,
        sum(cas.shares)                 AS n_shares,
        array_agg(cas.share_account_id) AS involved_accounts,
        jsonb_agg(cas.*)                AS shares
    FROM
        clearing_account_share cas
    GROUP BY
        cas.revision_id, cas.account_id;

create view creditor_shares_as_json(revision_id, transaction_id, n_shares, involved_accounts, shares) as
    SELECT
        cs.revision_id,
        cs.transaction_id,
        sum(cs.shares)           AS n_shares,
        array_agg(cs.account_id) AS involved_accounts,
        jsonb_agg(cs.*)          AS shares
    FROM
        creditor_share cs
    GROUP BY
        cs.revision_id, cs.transaction_id;

create view debitor_shares_as_json(revision_id, transaction_id, n_shares, involved_accounts, shares) as
    SELECT
        ds.revision_id,
        ds.transaction_id,
        sum(ds.shares)           AS n_shares,
        array_agg(ds.account_id) AS involved_accounts,
        jsonb_agg(ds.*)          AS shares
    FROM
        debitor_share ds
    GROUP BY
        ds.revision_id, ds.transaction_id;

create view purchase_item_usages_as_json(revision_id, item_id, n_usages, involved_accounts, usages) as
    SELECT
        piu.revision_id,
        piu.item_id,
        sum(piu.share_amount)     AS n_usages,
        array_agg(piu.account_id) AS involved_accounts,
        jsonb_agg(piu.*)          AS usages
    FROM
        purchase_item_usage piu
    GROUP BY
        piu.revision_id, piu.item_id;

create view transaction_tags (transaction_id, revision_id, tag_names) as
    select
        ttt.transaction_id,
        ttt.revision_id,
        array_agg(tag.name) AS tag_names
    from
        transaction_to_tag ttt
        join tag on ttt.tag_id = tag.id
    group by
        ttt.transaction_id, ttt.revision_id;

create or replace view account_tags (account_id, revision_id, tag_names) as
    select
        att.account_id,
        att.revision_id,
        array_agg(tag.name) AS tag_names
    from
        account_to_tag att
        join tag on att.tag_id = tag.id
    group by
        att.account_id, att.revision_id;

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
                    coalesce(csaj.involved_accounts, array[]::int[]) || coalesce(dsaj.involved_accounts, array[]::int[]) as involved_accounts,
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
