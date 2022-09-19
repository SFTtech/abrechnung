import { syncGroups } from "./database/groups";
import { syncAccounts } from "./database/accounts";
import { syncTransactions } from "./database/transactions";

export async function syncLocalState() {
    await syncGroups();
}

export async function syncLocalGroupState(groupID: number) {
    await syncLocalState();
    await syncAccounts(groupID);
    await syncTransactions(groupID);
}
