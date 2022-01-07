import {atomFamily, selectorFamily} from "recoil";
import {fetchAccount, fetchAccounts} from "../api";
import {ws} from "../websocket";
import {toast} from "react-toastify";
import {DateTime} from "luxon";

export const groupAccounts = atomFamily({
    key: "groupAccounts",
    default: [],
    effects_UNSTABLE: groupID => [
        ({setSelf, getPromise, node}) => {
            // TODO: handle fetch error
            setSelf(
                fetchAccounts({groupID: groupID})
                    .catch(err => toast.error(`error when fetching accounts: ${err}`))
            );

            const fetchAndUpdateAccount = (currAccounts, accountID, isNew) => {
                fetchAccount({accountID: accountID})
                    .then(account => {
                        if (isNew) { // new account
                            setSelf([
                                ...currAccounts,
                                account
                            ]);
                        } else {
                            setSelf(currAccounts.map(t => t.id === account.id ? account : t));
                        }
                    })
                    .catch(err => toast.error(`error when fetching account: ${err}`));
            }

            ws.subscribe("account", groupID, (subscription_type, {
                account_id,
                element_id,
                revision_committed,
                revision_version
            }) => {
                if (element_id === groupID) {
                    getPromise(node).then(currAccounts => {
                        const currAccount = currAccounts.find(a => a.id === account_id);
                        if (currAccount === undefined
                            || ((revision_committed === null && revision_version > currAccount.version)
                                || (revision_committed !== null && (currAccount.last_changed === null || DateTime.fromISO(revision_committed) > DateTime.fromISO(currAccount.last_changed))))) {
                            fetchAndUpdateAccount(currAccounts, account_id, currAccount === undefined);
                        }
                    })
                }
            });
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("account", groupID);
            };
        }
    ]
});

export const addAccount = (account, setAccounts) => {
    setAccounts(currAccounts => {
        return [
            ...currAccounts,
            account,
        ];
    })
}

export const updateAccount = (account, setAccounts) => {
    setAccounts(currAccounts => {
        return currAccounts.map(a => a.id === account.id ? account : a)
    })
}

export const accountsSeenByUser = selectorFamily({
    key: "accountsSeenByUser",
    get: groupID => async ({get}) => {
        const accounts = get(groupAccounts(groupID));

        return accounts
            .filter(account => {
                return !(account.committed_details && account.committed_details.deleted);
            })
            .map(account => {
                let mapped = {
                    id: account.id,
                    type: account.type,
                    version: account.version,
                    last_changed: account.last_changed,
                    group_id: account.group_id,
                    is_wip: account.is_wip,
                }
                if (account.pending_details) {
                    mapped = {
                        ...mapped,
                        ...account.pending_details,
                        has_committed_changes: account.committed_details != null
                    };
                } else {
                    mapped = {
                        ...mapped,
                        ...account.committed_details,
                        has_committed_changes: true
                    };
                }

                return mapped;
            })
            .sort((t1, t2) => {
                return t1.name === t2.name
                    ? t1.id < t2.id
                    : t1.name < t2.name;
            });
    }
})

export const personalAccountsSeenByUser = selectorFamily({
    key: "personalAccountsSeenByUser",
    get: groupID => async ({get}) => {
        const accounts = get(accountsSeenByUser(groupID));
        return accounts.filter(account => account.type === "personal");
    }
})

export const clearingAccountsSeenByUser = selectorFamily({
    key: "clearingAccountsSeenByUser",
    get: groupID => async ({get}) => {
        const accounts = get(accountsSeenByUser(groupID));
        return accounts.filter(account => account.type === "clearing");
    }
})

export const groupAccountByID = selectorFamily({
    key: "groupAccountByID",
    get: ({groupID, accountID}) => async ({get}) => {
        const accounts = get(accountsSeenByUser(groupID));
        return accounts?.find(account => account.id === accountID);
    }
});
