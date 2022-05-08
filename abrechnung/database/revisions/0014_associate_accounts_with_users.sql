-- revision: 174ef0fc
-- requires: c019dd21

alter table grp add column add_user_account_on_join boolean default false not null;

alter table account_history add column owning_user_id integer references usr(id);

drop view aggregated_committed_account_history;
create or replace view aggregated_committed_account_history as (
    select
        sub.revision_id,
        sub.account_id,
        sub.user_id,
        sub.group_id,
        sub.type,
        sub.started                                    as revision_started,
        sub.committed                                  as revision_committed,
        sub.version                                    as revision_version,
        first_value(sub.description) over outer_window as description,
        first_value(sub.name) over outer_window        as name,
        first_value(sub.priority) over outer_window    as priority,
        first_value(sub.owning_user_id) over outer_window    as owning_user_id,
        first_value(sub.deleted) over outer_window     as deleted,
        first_value(sub.n_clearing_shares) over outer_window        as n_clearing_shares,
        first_value(sub.clearing_shares) over outer_window          as clearing_shares,
        first_value(sub.involved_accounts) over outer_window        as involved_accounts
    from (
        select
            ar.id                as revision_id,
            ar.account_id,
            ar.user_id,
            ar.started,
            ar.committed,
            ar.version,
            a.group_id,
            a.type,
            count(a.id) over wnd as id_partition,
            ah.name,
            ah.description,
            ah.priority,
            ah.owning_user_id,
            ah.deleted,
            coalesce(cas.n_shares, 0)        as n_clearing_shares,
            coalesce(cas.shares, '[]'::jsonb) as clearing_shares,
            coalesce(cas.involved_accounts, array[]::int[]) as involved_accounts
        from
            account_revision ar
            join account a on a.id = ar.account_id
            left join account_history ah on ah.id = a.id and ar.id = ah.revision_id
            left join clearing_account_shares_as_json cas on a.id = cas.account_id and ar.id = cas.revision_id
        where
            ar.committed is not null window wnd as (partition by a.id order by committed asc)
    ) as sub window outer_window as (partition by sub.account_id, sub.id_partition order by sub.revision_id)
);

drop function committed_account_state_valid_at;
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
    revision_version   int,
    name               text,
    description        text,
    priority           int,
    owning_user_id     int,
    deleted            bool,
    n_clearing_shares  int,
    clearing_shares    jsonb,
    involved_accounts  int[]
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
    acah.revision_version,
    acah.name,
    acah.description,
    acah.priority,
    acah.owning_user_id,
    acah.deleted,
    acah.n_clearing_shares,
    acah.clearing_shares,
    acah.involved_accounts
from
    aggregated_committed_account_history acah
where
    acah.revision_committed <= committed_account_state_valid_at.valid_at
order by
    acah.account_id, acah.revision_committed desc
$$ language sql
    security invoker
    stable;


drop view aggregated_pending_account_history;
create or replace view aggregated_pending_account_history as (
    select
        ar.account_id,
        ar.id                             as revision_id,
        ar.user_id                        as changed_by,
        ar.started                        as revision_started,
        ar.version                        as revision_version,
        a.group_id,
        a.type,
        ah.name,
        ah.description,
        ah.priority,
        ah.owning_user_id,
        ah.deleted,
        coalesce(cas.n_shares, 0)        as n_clearing_shares,
        coalesce(cas.shares, '[]'::jsonb) as clearing_shares,
        coalesce(cas.involved_accounts, array[]::int[]) || coalesce(cas.involved_accounts, array[]::int[]) as involved_accounts
    from
        account_revision ar
        join account a on ar.account_id = a.id
        join account_history ah on a.id = ah.id and ar.id = ah.revision_id
        left join clearing_account_shares_as_json cas on a.id = cas.account_id and ar.id = cas.revision_id
    where
        ar.committed is null
);
