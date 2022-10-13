import { atomFamily, selectorFamily, SetterOrUpdater } from "recoil";
import { fetchAccount, fetchAccounts } from "../core/api";
import { ws } from "../core/websocket";
import { toast } from "react-toastify";
import { DateTime } from "luxon";

const accountTypeSortingLookup = {
    personal: 50,
    clearing: 100,
};

export type ClearingShares = { [k: number]: number };

export interface AccountDetail {
    name: string;
    description: string;
    priority: number;
    owning_user_id: number | null;
    committed_at: string | null;
    clearing_shares: ClearingShares;
    deleted: boolean;
}

export type AccountType = "personal" | "clearing";

export interface Account {
    id: number;
    type: AccountType;
    is_wip: boolean;
    last_changed: string;
    group_id: number;
    version: number;
    pending_details: AccountDetail | null;
    committed_details: AccountDetail | null;
}

export interface AccountConsolidated {
    id: number;
    type: AccountType;
    is_wip: boolean;
    last_changed: DateTime;
    group_id: number;
    version: number;
    has_committed_changes: boolean;
    name: string;
    description: string;
    owning_user_id: number | null;
    priority: number;
    committed_at: DateTime | null;
    clearing_shares: ClearingShares;
    deleted: boolean;
}

export const groupAccounts = atomFamily<Array<Account>, number>({
    key: "groupAccounts",
    effects_UNSTABLE: (groupID) => [
        ({ setSelf, getPromise, node }) => {
            // TODO: handle fetch error
            setSelf(
                fetchAccounts({ groupID: groupID }).catch((err) => toast.error(`error when fetching accounts: ${err}`))
            );

            const fetchAndUpdateAccount = (currAccounts: Array<Account>, accountID: number, isNew: boolean) => {
                fetchAccount({ accountID: accountID })
                    .then((account) => {
                        if (isNew) {
                            // new account
                            setSelf([...currAccounts, account]);
                        } else {
                            setSelf(currAccounts.map((t) => (t.id === account.id ? account : t)));
                        }
                    })
                    .catch((err) => toast.error(`error when fetching account: ${err}`));
            };

            ws.subscribe(
                "account",
                groupID,
                (subscription_type, { account_id, element_id, revision_committed, revision_version }) => {
                    if (element_id === groupID) {
                        getPromise(node).then((currAccounts) => {
                            const currAccount = currAccounts.find((a) => a.id === account_id);
                            if (
                                currAccount === undefined ||
                                (revision_committed === null && revision_version > currAccount.version) ||
                                (revision_committed !== null &&
                                    (currAccount.last_changed === null ||
                                        DateTime.fromISO(revision_committed) >
                                            DateTime.fromISO(currAccount.last_changed)))
                            ) {
                                fetchAndUpdateAccount(currAccounts, account_id, currAccount === undefined);
                            }
                        });
                    }
                }
            );
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("account", groupID);
            };
        },
    ],
});

export const addAccount = (account: Account, setAccounts: SetterOrUpdater<Array<Account>>) => {
    setAccounts((currAccounts) => {
        return [...currAccounts, account];
    });
};

export const updateAccount = (account: Account, setAccounts: SetterOrUpdater<Array<Account>>) => {
    setAccounts((currAccounts) => {
        return currAccounts.map((a) => (a.id === account.id ? account : a));
    });
};

export const accountsSeenByUser = selectorFamily<Array<AccountConsolidated>, number>({
    key: "accountsSeenByUser",
    get:
        (groupID) =>
        async ({ get }) => {
            const accounts = get(groupAccounts(groupID));

            return accounts
                .filter((account) => {
                    return !(account.committed_details && account.committed_details.deleted);
                })
                .map((account) => {
                    const details = account.pending_details ? account.pending_details : account.committed_details;
                    if (details === undefined) {
                        throw new Error(
                            "invalid account state: pending_details and committed_details should not be null at the same time"
                        );
                    }
                    const has_committed_changes = account.committed_details != null;
                    let mapped: AccountConsolidated = {
                        id: account.id,
                        type: account.type,
                        version: account.version,
                        last_changed: DateTime.fromISO(account.last_changed),
                        group_id: account.group_id,
                        is_wip: account.is_wip,
                        has_committed_changes: has_committed_changes,
                        ...details,
                        committed_at: details.committed_at != null ? DateTime.fromISO(details.committed_at) : null,
                    };

                    return mapped;
                })
                .sort((t1, t2) => {
                    return t1.type !== t2.type
                        ? accountTypeSortingLookup[t1.type] - accountTypeSortingLookup[t2.type]
                        : t1.name === t2.name
                        ? t1.id - t2.id
                        : t1.name.toLowerCase().localeCompare(t2.name.toLowerCase());
                });
        },
});

export const accountByIDMap = selectorFamily<{ [k: number]: AccountConsolidated }, number>({
    key: "accountByIDMap",
    get:
        (groupID) =>
        async ({ get }) => {
            const accounts = get(accountsSeenByUser(groupID));
            return accounts.reduce((map, curr) => {
                map[curr.id] = curr;
                return map;
            }, {});
        },
});

export const accountIDsToName = selectorFamily<{ [k: number]: string }, number>({
    key: "accountIDsToName",
    get:
        (groupID) =>
        async ({ get }) => {
            const accounts = get(accountsSeenByUser(groupID));
            return accounts.reduce((map, acc) => {
                map[acc.id] = acc.name;
                return map;
            }, {});
        },
});

export const personalAccountsSeenByUser = selectorFamily<Array<AccountConsolidated>, number>({
    key: "personalAccountsSeenByUser",
    get:
        (groupID) =>
        async ({ get }) => {
            const accounts = get(accountsSeenByUser(groupID));
            return accounts.filter((account) => account.type === "personal");
        },
});

export const clearingAccountsSeenByUser = selectorFamily<Array<AccountConsolidated>, number>({
    key: "clearingAccountsSeenByUser",
    get:
        (groupID) =>
        async ({ get }) => {
            const accounts = get(accountsSeenByUser(groupID));
            return accounts.filter((account) => account.type === "clearing");
        },
});

export type ParamGroupAccount = {
    groupID: number;
    accountID: number;
};

export const clearingAccountsInvolvingUser = selectorFamily<Array<AccountConsolidated>, ParamGroupAccount>({
    key: "clearingAccountsInvolvingUser",
    get:
        ({ groupID, accountID }) =>
        async ({ get }) => {
            return get(clearingAccountsSeenByUser(groupID)).filter((account) =>
                account.clearing_shares.hasOwnProperty(accountID)
            );
        },
});

export const groupAccountByID = selectorFamily<AccountConsolidated | undefined, ParamGroupAccount>({
    key: "groupAccountByID",
    get:
        ({ groupID, accountID }) =>
        async ({ get }) => {
            const accounts = get(accountsSeenByUser(groupID));
            return accounts?.find((account) => account.id === accountID);
        },
});

export type ParamGroupUser = {
    groupID: number;
    userID: number;
};

export const accountsOwnedByUser = selectorFamily<Array<AccountConsolidated>, ParamGroupUser>({
    key: "groupAccountByID",
    get:
        ({ groupID, userID }) =>
        async ({ get }) => {
            const accounts = get(accountsSeenByUser(groupID));
            return accounts.filter((account) => account.owning_user_id === userID);
        },
});
