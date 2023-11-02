import { Account, ClearingShares } from "@abrechnung/types";
import { Account as BackendAccount, AccountDetails as BackendAccountDetails } from "./generated";

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
        clearingShares: details.clearing_shares as ClearingShares,
        deleted: details.deleted,
        description: details.description,
        tags: details.tags,
        dateInfo: details.date_info as string,
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
            type: "personal",
            isWip: acc.is_wip,
            hasLocalChanges: false,
            ...personalDetailsToFields(backendDetails),
            lastChanged: acc.last_changed,
        };
    } else {
        return {
            id: acc.id,
            groupID: acc.group_id,
            type: "clearing",
            isWip: acc.is_wip,
            hasLocalChanges: false,
            ...clearingDetailsToFields(backendDetails),
            lastChanged: acc.last_changed,
        };
    }
}
