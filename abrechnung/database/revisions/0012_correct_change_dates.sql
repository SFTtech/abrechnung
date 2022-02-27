-- revision: 5b333d87
-- requires: f6c9ff0b

create or replace function full_transaction_state_valid_at(
    seen_by_user int,
    valid_at timestamptz = now()
)
    returns table (
        transaction_id      int,
        type                text,
        group_id            int,
        last_changed        timestamptz,
        version             int,
        is_wip              bool,
        committed_details   jsonb,
        pending_details     jsonb,
        committed_positions jsonb,
        pending_positions   jsonb,
        committed_files     jsonb,
        pending_files       jsonb
    )
as
$$
select
    t.id as transaction_id,
    t.type,
    t.group_id,
    greatest(
        committed_details.last_changed,
        committed_positions.last_changed,
        committed_files.last_changed,
        pending_details.last_changed,
        pending_positions.last_changed,
        pending_files.last_changed
    ) as last_changed,
    greatest(
        committed_details.revision_version,
        committed_positions.revision_version,
        committed_files.revision_version,
        pending_details.revision_version,
        pending_positions.revision_version,
        pending_files.revision_version
    ) as version,
    exists(
        select 1 from transaction_revision tr
        where tr.transaction_id = t.id and tr.user_id = full_transaction_state_valid_at.seen_by_user and tr.committed is null
    ) as is_wip,
    committed_details.json_state as committed_details,
    pending_details.json_state as pending_details,
    committed_positions.json_state as committed_positions,
    pending_positions.json_state as pending_positions,
    committed_files.json_state as committed_files,
    pending_files.json_state as pending_files
from
    transaction t
    left join (
        select
            ctsa.transaction_id,
            jsonb_agg(ctsa) as json_state,
            max(ctsa.revision_committed) as last_changed,
            max(ctsa.revision_version) as revision_version
        from committed_transaction_state_valid_at(full_transaction_state_valid_at.valid_at) ctsa
        group by ctsa.transaction_id
              ) committed_details on t.id = committed_details.transaction_id
    left join (
        select
            apth.transaction_id,
            jsonb_agg(apth) as json_state,
            max(apth.revision_started) as last_changed,
            max(apth.revision_version) as revision_version
        from aggregated_pending_transaction_history apth
        where apth.changed_by = full_transaction_state_valid_at.seen_by_user
        group by apth.transaction_id
              ) pending_details on t.id = pending_details.transaction_id
    left join (
        select
            ctpsa.transaction_id,
            jsonb_agg(ctpsa) as json_state,
            max(ctpsa.revision_committed) as last_changed,
            max(ctpsa.revision_version) as revision_version
        from committed_transaction_position_state_valid_at(full_transaction_state_valid_at.valid_at) ctpsa
        group by ctpsa.transaction_id
              ) committed_positions on t.id = committed_positions.transaction_id
    left join (
        select
            aptph.transaction_id,
            jsonb_agg(aptph) as json_state,
            max(aptph.revision_started) as last_changed,
            max(aptph.revision_version) as revision_version
        from aggregated_pending_transaction_position_history aptph
        where aptph.changed_by = full_transaction_state_valid_at.seen_by_user
        group by aptph.transaction_id
              ) pending_positions on t.id = pending_positions.transaction_id
    left join (
        select
            cfsva.transaction_id,
            jsonb_agg(cfsva) as json_state,
            max(cfsva.revision_committed) as last_changed,
            max(cfsva.revision_version) as revision_version
        from committed_file_state_valid_at(full_transaction_state_valid_at.valid_at) cfsva
        group by cfsva.transaction_id
              ) committed_files on t.id = committed_files.transaction_id
    left join (
        select
            apfh.transaction_id,
            jsonb_agg(apfh) as json_state,
            max(apfh.revision_started) as last_changed,
            max(apfh.revision_version) as revision_version
        from aggregated_pending_file_history apfh
        where apfh.changed_by = full_transaction_state_valid_at.seen_by_user
        group by apfh.transaction_id
              ) pending_files on t.id = pending_files.transaction_id
where committed_details.json_state is not null or pending_details.json_state is not null
$$ language sql
    security invoker
    stable;
