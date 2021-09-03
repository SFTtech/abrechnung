import {atom, atomFamily, selector, selectorFamily} from "recoil";
import {fetchAccounts, fetchGroups, fetchInvites, fetchLog, fetchMembers, getUserIDFromToken} from "../api";
import {ws} from "../websocket";
import {userData} from "./auth";

export const groupList = atom({
    key: "groupList",
    default: selector({
        key: "groupList/default",
        get: async ({get}) => {
            return await fetchGroups();
        }
    }),
    effects_UNSTABLE: [
        ({setSelf, trigger}) => {
            const userID = getUserIDFromToken();
            ws.subscribe("group", userID, ({subscription_type, element_id}) => {
                if (subscription_type === "group" && element_id === userID) {
                    fetchGroups().then(result => setSelf(result));
                }
            })
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group", userID);
            };
        }
    ]
})

export const groupById = atomFamily({
    key: "groupById",
    default: selectorFamily({
        key: "groupById/default",
        get: groupID => async ({get}) => {
            const groups = await get(groupList);
            return groups.find(group => group.id === groupID);
        }
    })
})

export const currUserPermissions = selectorFamily({
    key: "currUserPermissions",
    get: groupID => async ({get}) => {
        const members = get(groupMembers(groupID));
        const currUser = get(userData);
        return members.find(member => member.user_id === currUser.id);
    }
})

export const groupAccountsRaw = atomFamily({
    key: "groupAccountsRaw",
    default: selectorFamily({
        key: "groupAccountsRaw/default",
        get: groupID => async ({get}) => {
            return await fetchAccounts({groupID: groupID});
        }
    }),
    effects_UNSTABLE: groupID => [
        ({setSelf, trigger}) => {
            ws.subscribe("account", groupID, ({subscription_type, account_id, element_id}) => {
                if (subscription_type === "account" && element_id === groupID) {
                    // fetchAccount({groupID: group_id, accountID: account_id})
                    //     .then(result => setSelf(result));
                    fetchAccounts({groupID: element_id}).then(result => {
                        // only show accounts that haven't been deleted
                        setSelf(result);
                    });
                }
            })
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("account", groupID);
            };
        }
    ]
})

export const groupAccounts = selectorFamily({
    key: "groupAccounts",
    get: groupID => async ({get}) => {
        const accounts = await get(groupAccountsRaw(groupID));
        return accounts.filter(account => !account.deleted);
    }
})

export const groupMembers = atomFamily({
    key: "groupMembers",
    default: selectorFamily({
        key: "groupMembers/default",
        get: groupID => async ({get}) => {
            return await fetchMembers({groupID: groupID});
        }
    }),
    effects_UNSTABLE: groupID => [
        ({setSelf, trigger}) => {
            ws.subscribe("group_member", groupID, ({subscription_type, user_id, element_id}) => {
                if (subscription_type === "group_member" && element_id === groupID) {
                    fetchMembers({groupID: element_id}).then(result => setSelf(result));
                }
            })
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group_member", groupID);
            };
        }
    ]
})

export const groupInvites = atomFamily({
    key: "groupInvites",
    default: selectorFamily({
        key: "groupInvites/default",
        get: groupID => async ({get}) => {
            return await fetchInvites({groupID: groupID});
        }
    }),
    effects_UNSTABLE: groupID => [
        ({setSelf, trigger}) => {
            ws.subscribe("group_invite", groupID, ({subscription_type, invite_id, element_id}) => {
                if (subscription_type === "group_invite" && element_id === groupID) {
                    fetchInvites({groupID: element_id}).then(result => setSelf(result));
                }
            })
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group_invite", groupID);
            };
        }
    ]
})

export const groupAccountByID = selectorFamily({
    key: "groupAccountByID",
    get: ({groupID, accountID}) => async ({get}) => {
        const accounts = get(groupAccounts(groupID));
        return accounts?.find(account => account.id === accountID);
    }
})

export const groupLog = atomFamily({
    key: "groupLog",
    default: selectorFamily({
        key: "groupLog/default",
        get: groupID => async ({get}) => {
            return await fetchLog({groupID: groupID});
        }
    }),
    effects_UNSTABLE: groupID => [
        ({setSelf, trigger}) => {
            ws.subscribe("group_log", groupID, ({subscription_type, log_id, element_id}) => {
                if (subscription_type === "group_log" && element_id === groupID) {
                    fetchLog({groupID: element_id}).then(result => setSelf(result));
                }
            })
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group_log", groupID);
            };
        }
    ]
})
