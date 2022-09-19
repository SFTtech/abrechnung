import { makeDelete, makeGet, makePost } from "./index";
import { Account } from "@abrechnung/types";

function backendAccountToAccount(acc): Account {
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
    return <Account>{
        id: acc.id,
        group_id: acc.group_id,
        type: acc.type,
        version: acc.version,
        is_wip: acc.is_wip,
        ...detailsToFields(acc.committed_details),
        ...detailsToFields(acc.pending_details),
        has_local_changes: false,
    };
}

export async function fetchAccounts({ groupID }): Promise<Account[]> {
    const accounts = await makeGet(`/groups/${groupID}/accounts`);
    return accounts.map((acc) => backendAccountToAccount(acc));
}

export async function fetchAccount({ accountID }): Promise<Account> {
    const account = await makeGet(`/accounts/${accountID}`);
    return backendAccountToAccount(account);
}

export async function pushAccountChanges(account: Account) {
    if (account.id < 0) {
        const updatedAccount = await makePost(`/groups/${account.group_id}/accounts`, {
            type: account.type,
            name: account.name,
            description: account.description,
            owning_user_id: account.owning_user_id,
            clearing_shares: account.clearing_shares,
        });
        return backendAccountToAccount(updatedAccount);
    } else {
        const updatedAccount = await makePost(`/accounts/${account.id}`, {
            name: account.name,
            description: account.description,
            owning_user_id: account.owning_user_id,
            clearing_shares: account.clearing_shares,
        });
        return backendAccountToAccount(updatedAccount);
    }
}

export async function deleteAccount({ accountID }) {
    return await makeDelete(`/accounts/${accountID}`);
}
