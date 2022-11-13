import { Account, AccountType, ClearingShares } from "@abrechnung/types";
import { fromISOString } from "@abrechnung/utils";

export interface BackendAccountDetails {
    name: string;
    description: string;
    priority: number;
    owning_user_id: number | null;
    clearing_shares: ClearingShares;
    revision_committed_at: string;
    revision_started_at: string;
    deleted: boolean;
}

export interface BackendAccount {
    id: number;
    group_id: number;
    type: AccountType;
    last_changed: string;
    is_wip: boolean;
    version: number;
    committed_details: BackendAccountDetails | null;
    pending_details: BackendAccountDetails | null;
}

export function backendAccountToAccount(acc: BackendAccount): Account {
    const detailsToFields = (details: BackendAccountDetails) => {
        return {
            clearingShares: details.clearing_shares,
            deleted: details.deleted,
            description: details.description,
            name: details.name,
            owningUserID: details.owning_user_id,
        };
    };
    if (acc.committed_details === null && acc.pending_details === null) {
        throw Error("received invalid account from backend");
    }

    return {
        id: acc.id,
        groupID: acc.group_id,
        type: acc.type,
        isWip: acc.is_wip,
        hasLocalChanges: false,
        ...detailsToFields((acc.pending_details ?? acc.committed_details) as BackendAccountDetails),
        lastChanged: acc.last_changed,
    };
}
