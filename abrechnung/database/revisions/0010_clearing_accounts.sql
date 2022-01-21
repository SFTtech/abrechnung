-- revision: c85ea20c
-- requires: bf5fbd44

insert into account_type (name) values ('clearing');

create table if not exists clearing_account_share (
    account_id int not null references account(id),
    revision_id bigint not null references account_revision(id),
    share_account_id int not null references account(id),
    primary key (account_id, revision_id, share_account_id),

    shares double precision not null
);

-- fix the committed change check
create or replace function check_account_revisions_change_per_user(account_id integer, user_id integer, committed timestamp with time zone)
returns boolean
as
$$
<<locals>> declare
    n_uncommitted int;
begin
    if committed is not null then return true; end if;

    select count(*) into locals.n_uncommitted
    from
        account_revision ar
    where
        ar.account_id = check_account_revisions_change_per_user.account_id
        and ar.user_id = check_account_revisions_change_per_user.user_id
        and ar.committed is null;

    if locals.n_uncommitted > 1 then raise 'users can only have one pending change per account'; end if;

    return true;
end
$$ language plpgsql;

create or replace function check_committed_accounts(
    revision_id bigint,
    account_id integer,
    started timestamptz,
    committed timestamptz
) returns boolean as
$$
<<locals>> declare
    n_clearing_shares int;
    group_id          int;
    account_type      text;
    account_deleted   boolean;
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
        ah.deleted,
        a.group_id
    into locals.account_type, locals.account_deleted, locals.group_id
    from
        account a
        left join account_history ah on a.id = ah.id and ah.revision_id = check_committed_accounts.revision_id
    where a.id = check_committed_accounts.account_id;

    select
        count(cas.share_account_id)
    into locals.n_clearing_shares
    from
        clearing_account_share cas
    where
        cas.account_id = check_committed_accounts.account_id
        and cas.revision_id = check_committed_accounts.revision_id;

    if locals.account_type = 'personal' then
        if locals.n_clearing_shares != 0 then
            raise '"personal" type accounts cannot have associated settlement distribution shares';
        end if;
    end if;

    return true;
end
$$ language plpgsql;

create or replace function check_clearing_accounts_for_cyclic_dependencies(
    revision_id bigint,
    account_id integer,
    committed timestamptz
) returns boolean as
$$
<<locals>> declare
    group_id          int;
    account_type      text;

    n_clearing_shares int;

    cycle_path        int[];
begin
    if committed is null then return true; end if;

    select
        a.type,
        a.group_id
    into locals.account_type, locals.group_id
    from
        account a
    where a.id = check_clearing_accounts_for_cyclic_dependencies.account_id;

    select
        count(cas.share_account_id)
    into locals.n_clearing_shares
    from
        clearing_account_share cas
    where
        cas.account_id = check_clearing_accounts_for_cyclic_dependencies.account_id
        and cas.revision_id = check_clearing_accounts_for_cyclic_dependencies.revision_id;

    -- now for the juicy part - check if we have circular dependencies in clearing account relations
    with recursive search_graph(account_id, share_account_id, depth, path, cycle) as (
        select shares.account_id, shares.share_account_id, 1, array[shares.account_id], false
        from clearing_account_share shares
        where shares.revision_id = check_clearing_accounts_for_cyclic_dependencies.revision_id
        union all
        select shares.account_id, shares.share_account_id, sg.depth + 1, sg.path || shares.account_id, shares.account_id = any(sg.path)
        from clearing_account_share shares
            join account a on shares.account_id = a.id
            join search_graph sg on sg.share_account_id = shares.account_id and not sg.cycle
        where a.group_id = locals.group_id -- slight optimization for runtime
    )
    select path into locals.cycle_path from search_graph where cycle limit 1;
    -- TODO: good error message and print out all resulting cycles
    if found then
        raise 'this change would result in a cyclic dependency between clearing accounts: %', locals.cycle_path;
    end if;

    return true;
end
$$ language plpgsql;

alter table account_revision add constraint account_revision_check_cyclic
    check (check_clearing_accounts_for_cyclic_dependencies(id, account_id, committed));

create or replace view clearing_account_shares_as_json as
select
   revision_id,
   account_id,
   sum(shares)                 as n_shares,
   array_agg(share_account_id) as involved_accounts,
   jsonb_agg(cas.*)            as shares
from clearing_account_share cas
group by revision_id, account_id;

drop function committed_account_state_valid_at;

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


create or replace function full_account_state_valid_at(
    seen_by_user int,
    valid_at timestamptz = now()
)
returns table (
    account_id          int,
    type                text,
    group_id            int,
    last_changed        timestamptz,
    version             int,
    is_wip              bool,
    committed_details   jsonb,
    pending_details     jsonb
)
as
$$
select
    a.id as account_id,
    a.type,
    a.group_id,
    committed_details.last_changed as last_changed,
    greatest(
        committed_details.revision_version,
        pending_details.revision_version
    ) as version,
    exists(
        select 1 from account_revision ar
        where ar.account_id = a.id and ar.user_id = full_account_state_valid_at.seen_by_user and ar.committed is null
    ) as is_wip,
    committed_details.json_state as committed_details,
    pending_details.json_state as pending_details
from
    account a
left join (
    select
        casa.account_id,
        jsonb_agg(casa) as json_state,
        max(casa.revision_committed) as last_changed,
        max(casa.revision_version) as revision_version
    from committed_account_state_valid_at(full_account_state_valid_at.valid_at) casa
    group by casa.account_id
) committed_details on a.id = committed_details.account_id
left join (
    select
        apah.account_id,
        jsonb_agg(apah) as json_state,
        max(apah.revision_version) as revision_version
    from aggregated_pending_account_history apah
    where apah.changed_by = full_account_state_valid_at.seen_by_user
    group by apah.account_id
) pending_details on a.id = pending_details.account_id
where committed_details.json_state is not null or pending_details.json_state is not null
$$ language sql
    security invoker
    stable;
