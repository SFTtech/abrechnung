import { syncGroups } from "./database/groups";
import { syncAccounts } from "./database/accounts";
import { syncTransactions } from "./database/transactions";
import { Group } from "@abrechnung/types";

export async function syncLocalState(): Promise<Group[]> {
    return await syncGroups();
}

export async function syncLocalGroupState(groupID: number) {
    await syncLocalState();
    await syncAccounts(groupID);
    await syncTransactions(groupID);
}
