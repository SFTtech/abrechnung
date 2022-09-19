import { Account } from "@abrechnung/types";

export function backendAccountToAccount(acc): Account {
    const detailsToFields = (details) => {
        if (details === null) {
            return {};
        }
        return {
            clearing_shares: details.clearing_shares,
            revision_committed_at: details.revision_committed_at,
            revision_started_at: details.revision_started_at,
            deleted: details.deleted,
            description: details.description,
            name: details.name,
            priority: details.priority,
            owning_user_id: details.owning_user_id,
        };
    };
    return {
        id: acc.id,
        group_id: acc.group_id,
        type: acc.type,
        version: acc.version,
        is_wip: acc.is_wip,
        ...detailsToFields(acc.committed_details),
        ...detailsToFields(acc.pending_details),
        has_local_changes: false,
    } as Account;
}
