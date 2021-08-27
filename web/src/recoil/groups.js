import {atom, atomFamily, selector, selectorFamily} from "recoil";
import {fetchAccounts, fetchGroups, fetchMembers} from "../api";
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
            ws.subscribeUser("group", ({scope, group_id}) => {
                if (scope === "group") {
                    // fetchGroup({groupID: group_id})
                    //     .then(result => setSelf(result));
                    fetchGroups().then(result => setSelf(result));
                }
            })
            // TODO: handle registration errors

            return () => {
                ws.unsubscribeUser("group");
            };
        }
    ]
})

export const groupById = atomFamily({
    key: "groupById",
    default: selectorFamily({
        key: "groupById/default",
        get: groupID => async ({get}) => {
            return get(groupList).find(group => group.id === groupID);
        }
    })
})

export const currUserPermissions = selectorFamily({
    key: "currUserPermissions",
    get: groupID => async ({get}) => {
        const group = get(groupById(groupID));
        const currUser = get(userData);
        return group?.members.find(member => member.user_id === currUser.id);
    }
})

export const groupAccounts = atomFamily({
    key: "groupAccounts",
    default: selectorFamily({
        key: "groupAccounts/default",
        get: groupID => async ({get}) => {
            return await fetchAccounts(groupID);
        }
    }),
    effects_UNSTABLE: groupID => [
        ({setSelf, trigger}) => {
            ws.subscribe("account", groupID, ({scope, group_id, account_id}) => {
                if (scope === "account" && group_id === groupID) {
                    // fetchAccount({groupID: group_id, accountID: account_id})
                    //     .then(result => setSelf(result));
                    fetchAccounts(group_id).then(result => setSelf(result));
                }
            })
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("account", groupID);
            };
        }
    ]
})

export const groupMembers = atomFamily({
    key: "groupMembers",
    default: selectorFamily({
        key: "groupMembers/default",
        get: groupID => async ({get}) => {
            return await fetchMembers(groupID);
        }
    }),
    // effects_UNSTABLE: groupID => [
    //     ({setSelf, trigger}) => {
    //         ws.subscribe("member", groupID, ({scope, group_id, user_id}) => {
    //             if (scope === "member" && group_id === groupID) {
    //                 // fetchMember({groupID: group_id, userID: user_id})
    //                 //     .then(result => setSelf(result));
    //                 fetchMembers(group_id).then(result => setSelf(result));
    //             }
    //         })
    //         // TODO: handle registration errors
    //
    //         return () => {
    //             ws.unsubscribe("member", groupID);
    //         };
    //     }
    // ]
})

export const groupAccountByID = selectorFamily({
    key: "groupAccountByID",
    get: ({groupID, accountID}) => async ({get}) => {
        const accounts = get(groupAccounts(groupID));
        return accounts?.find(account => account.id === accountID);
    }
})

// const fetchGroupLog = async groupID => {
//     return await ws.call("group_log_get", {
//         authtoken: fetchToken(),
//         group_id: groupID,
//         from_id: 0,
//     });
// }
//
// export const groupLog = atomFamily({
//     key: "groupLog",
//     default: selectorFamily({
//         key: "groupLog/default",
//         get: groupID => async ({get}) => {
//             return await fetchGroupLog(groupID);
//         }
//     }),
//     effects_UNSTABLE: groupID => [
//         ({setSelf, trigger}) => {
//             ws.subscribe(fetchToken(), "group_log", ({element_id}) => {
//                 if (element_id === groupID) {
//                     console.log("reloading group log")
//                     fetchGroupLog(groupID).then(result => setSelf(result));
//                 }
//             }, {element_id: groupID})
//             // TODO: handle registration errors
//
//             return () => {
//                 ws.unsubscribe("group_log", {element_id: groupID});
//             };
//         }
//     ]
// })

//
// export const createGroupLog = async ({groupID, message}) => {
//     return await ws.call("group_log_post", {
//         authtoken: fetchToken(),
//         group_id: groupID,
//         message: message,
//     });
// }
