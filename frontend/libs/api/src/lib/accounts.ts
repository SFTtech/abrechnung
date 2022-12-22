import { Account, AccountType, ClearingShares } from "@abrechnung/types";

export interface BackendAccountDetails {
    name: string;
    description: string;
    priority: number;
    owning_user_id: number | null;
    date_info: string | null;
    tags: string[];
    clearing_shares: ClearingShares;
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

const personalDetailsToFields = (details: BackendAccountDetails) => {
    return {
        deleted: details.deleted,
        description: details.description,
        name: details.name,
        owningUserID: details.owning_user_id,
    };
};

const clearingDetailsToFields = (details: BackendAccountDetails) => {
    return {
        clearingShares: details.clearing_shares,
        deleted: details.deleted,
        description: details.description,
        tags: details.tags,
        dateInfo: details.date_info,
        name: details.name,
    };
};

export function backendAccountToAccount(acc: BackendAccount): Account {
    if (acc.committed_details == null && acc.pending_details == null) {
        throw Error("received invalid account from backend");
    }

    const backendDetails = (acc.pending_details ?? acc.committed_details) as BackendAccountDetails;

    if (acc.type === "personal") {
        return {
            id: acc.id,
            groupID: acc.group_id,
            type: acc.type,
            isWip: acc.is_wip,
            hasLocalChanges: false,
            ...personalDetailsToFields(backendDetails),
            lastChanged: acc.last_changed,
        };
    } else {
        return {
            id: acc.id,
            groupID: acc.group_id,
            type: acc.type,
            isWip: acc.is_wip,
            hasLocalChanges: false,
            ...clearingDetailsToFields(backendDetails),
            lastChanged: acc.last_changed,
        };
    }
}
