import {atom, atomFamily, selectorFamily} from "recoil";
import {
    fetchAccount,
    fetchAccounts,
    fetchGroups,
    fetchInvites,
    fetchLog,
    fetchMembers,
    fetchTransaction,
    getUserIDFromToken
} from "../api";
import {ws} from "../websocket";
import {userData} from "./auth";
import {DateTime} from "luxon";
import {toast} from "react-toastify";

const sortGroups = (groups) => {
    return groups.sort((g1, g2) => g1.id > g2.id);
}

export const groupList = atom({
    key: "groupList",
    default: [],
    effects_UNSTABLE: [
        ({setSelf}) => {
            // TODO: handle fetch error
            setSelf(
                fetchGroups()
                    .then(groups => sortGroups(groups))
                    .catch(err => toast.error(`error when fetching groups: ${err}`))
            );

            const userID = getUserIDFromToken();
            ws.subscribe("group", userID, ({subscription_type, element_id}) => {
                if (subscription_type === "group" && element_id === userID) {
                    fetchGroups().then(result => setSelf(sortGroups(result)));
                }
            });
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group", userID);
            };
        }
    ]
});

export const groupById = atomFamily({
    key: "groupById",
    default: selectorFamily({
        key: "groupById/default",
        get: groupID => async ({get}) => {
            const groups = get(groupList);
            return groups.find(group => group.id === groupID);
        }
    })
});

export const currUserPermissions = selectorFamily({
    key: "currUserPermissions",
    get: groupID => async ({get}) => {
        const members = get(groupMembers(groupID));
        const currUser = get(userData);
        return members.find(member => member.user_id === currUser.id);
    }
});

export const groupAccountsRaw = atomFamily({
    key: "groupAccountsRaw",
    default: [],
    effects_UNSTABLE: groupID => [
        ({setSelf, getPromise, node}) => {
            // TODO: handle fetch error
            setSelf(
                fetchAccounts({groupID: groupID})
                    .catch(err => toast.error(`error when fetching accounts: ${err}`))
            );

            const fetchAndUpdateAccount = (currAccounts, accountID) => {
                fetchAccount({accountID: accountID})
                    .then(account => {
                        setSelf(currAccounts.map(t => t.id === account.id ? account : t));
                    })
                    .catch(err => toast.error(`error when fetching account: ${err}`));
            }

            ws.subscribe("account", groupID, (subscription_type, {account_id, element_id, revision_committed, revision_version}) => {
                if (element_id === groupID) {
                    getPromise(node).then(currAccounts => {
                        const currAccount = currAccounts.find(t => t.id === account_id);
                        if (!currAccount) {
                            return;
                        }

                        if (currAccount.version > revision_version || (revision_committed !== null && currAccount.committed === null)) {
                            console.log(`received notification about changes to transaction ${account_id} that are not known locally`);
                            fetchAndUpdateAccount(currAccounts, account_id);
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

export const groupAccounts = selectorFamily({
    key: "groupAccounts",
    get: groupID => async ({get}) => {
        const accounts = get(groupAccountsRaw(groupID));
        return accounts.filter(account => !account.deleted).sort((a1, a2) => a1.name > a2.name);
    }
});

const sortMembers = (members) => {
    return members.sort((m1, m2) => DateTime.fromISO(m1.joined_at) < DateTime.fromISO(m2.joined_at));
};

export const groupMembers = atomFamily({
    key: "groupMembers",
    default: [],
    effects_UNSTABLE: groupID => [
        ({setSelf}) => {
            setSelf(
                fetchMembers({groupID: groupID})
                    .then(members => sortMembers(members))
                    .catch(err => toast.error(`error when fetching group members: ${err}`))
            );

            ws.subscribe("group_member", groupID, (subscription_type, {user_id, element_id}) => {
                if (subscription_type === "group_member" && element_id === groupID) {
                    fetchMembers({groupID: element_id}).then(result => setSelf(sortMembers(result)));
                }
            });
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group_member", groupID);
            };
        }
    ]
});

export const groupInvites = atomFamily({
    key: "groupInvites",
    default: [],
    effects_UNSTABLE: groupID => [
        ({setSelf}) => {
            setSelf(
                fetchInvites({groupID: groupID})
                    .catch(err => toast.error(`error when fetching group invites: ${err}`))
            );

            ws.subscribe("group_invite", groupID, (subscription_type, {invite_id, element_id}) => {
                if (subscription_type === "group_invite" && element_id === groupID) {
                    fetchInvites({groupID: element_id}).then(result => setSelf(result));
                }
            });
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group_invite", groupID);
            };
        }
    ]
});

export const groupAccountByID = selectorFamily({
    key: "groupAccountByID",
    get: ({groupID, accountID}) => async ({get}) => {
        const accounts = get(groupAccounts(groupID));
        return accounts?.find(account => account.id === accountID);
    }
});

export const groupLog = atomFamily({
    key: "groupLog",
    default: [],
    effects_UNSTABLE: groupID => [
        ({setSelf}) => {
            setSelf(
                fetchLog({groupID: groupID})
                    .catch(err => toast.error(`error when fetching group log: ${err}`))
            );

            ws.subscribe("group_log", groupID, (subscription_type, {log_id, element_id}) => {
                if (subscription_type === "group_log" && element_id === groupID) {
                    fetchLog({groupID: element_id}).then(result => setSelf(result));
                }
            });
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group_log", groupID);
            };
        }
    ]
});
