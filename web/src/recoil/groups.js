import {atom, atomFamily, selectorFamily} from "recoil";
import {fetchAccounts, fetchGroups, fetchInvites, fetchLog, fetchMembers, getUserIDFromToken} from "../api";
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
        ({setSelf}) => {
            // TODO: handle fetch error
            setSelf(
                fetchAccounts({groupID: groupID})
                    .catch(err => toast.error(`error when fetching accounts: ${err}`))
            );

            ws.subscribe("account", groupID, ({subscription_type, account_id, element_id}) => {
                if (subscription_type === "account" && element_id === groupID) {
                    // fetchAccount({ groupID: element_id, accountID: account_id }).then(result => {
                    //     setSelf(currVal => {
                    //         if (currVal.find(a => a.id === account_id) !== undefined) {
                    //             return currVal.map(a => a.id === account_id ? result : a);
                    //         }
                    //
                    //         return [...currVal, result];
                    //     });
                    // }).catch(err => {
                    //     toast.error(`Reloading accounts had error: ${err}`);
                    // });
                    fetchAccounts({groupID: groupID})
                        .then(result => setSelf(result))
                        .catch(err => {
                            toast.error(`Reloading accounts had error: ${err}`);
                        });
                }
            });
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("account", groupID);
            };
        }
    ]
});

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

            ws.subscribe("group_member", groupID, ({subscription_type, user_id, element_id}) => {
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

            ws.subscribe("group_invite", groupID, ({subscription_type, invite_id, element_id}) => {
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

            ws.subscribe("group_log", groupID, ({subscription_type, log_id, element_id}) => {
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
