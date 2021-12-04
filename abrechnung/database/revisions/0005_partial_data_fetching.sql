-- revision: 64df13c9
-- requires: f133b1d3

drop view current_transaction_state;

create or replace view current_transaction_state as
select
    transaction.id                as id,
    transaction.type              as type,
    transaction.group_id          as group_id,
    curr_state_json.state         as current_state,
    pending_json.state            as pending_changes,
    curr_state_json.last_changed  as last_changed,
    pending_json.pending_user_ids as users_with_pending_changes
from
    transaction
    left join (
        select
            id,
            max(curr_state.revision_committed) as last_changed,
            json_agg(curr_state) as state
        from committed_transaction_state curr_state
        group by id
    ) curr_state_json on curr_state_json.id = transaction.id
    left join (
        select
            id,
            array_agg(pending.user_id) as pending_user_ids,
            json_agg(pending) as state
        from pending_transaction_revisions pending
        group by id
    ) pending_json on pending_json.id = transaction.id;
