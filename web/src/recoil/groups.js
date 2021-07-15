import {atom, atomFamily, selector, selectorFamily} from "recoil";
import {ws} from "../websocket";
import {fetchToken, fetchUserID} from "./auth";

const fetchGroups = async () => {
    return await ws.call("group_list", {
        authtoken: fetchToken(),
    });
}

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
            const userID = fetchUserID();
            console.log("group subscription user id", userID)
            ws.subscribe(fetchToken(), "group", () => {
                fetchGroups().then(result => setSelf(result));
            }, {element_id: userID})
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group", {element_id: userID});
            };
        }
    ]
})

export const groupById = atomFamily({
    key: "groupById",
    default: selectorFamily({
        key: "groupById/default",
        get: groupID => async ({get}) => {
            const metadata = (await ws.call("group_metadata_get", {
                authtoken: fetchToken(),
                group_id: groupID,
            }))[0];
            return {
                ...get(groupList).find(group => group.group_id === groupID),
                ...metadata
            }
        }
    })
})

const fetchGroupMembers = async groupID => {
    return await ws.call("group_member_list", {
        authtoken: fetchToken(),
        group_id: groupID,
    });
}

export const groupMembers = atomFamily({
    key: "groupMembers",
    default: selectorFamily({
        key: "groupMembers/default",
        get: groupID => async ({get}) => {
            return await fetchGroupMembers(groupID);
        }
    }),
    effects_UNSTABLE: groupID => [
        ({setSelf, trigger}) => {
            ws.subscribe(fetchToken(), "group_membership", ({element_id}) => {
                if (element_id === groupID) {
                    console.log("reloading group members")
                    fetchGroupMembers(groupID).then(result => setSelf(result));
                }
            }, {element_id: groupID})
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group_membership", {element_id: groupID});
            };
        }
    ]
})

const fetchAccounts = async groupID => {
    return await ws.call("account_list", {
        authtoken: fetchToken(),
        group_id: groupID,
    });
}

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
            ws.subscribe(fetchToken(), "account", ({element_id}) => {
                if (element_id === groupID) {
                    console.log("reloading accounts")
                    fetchAccounts(groupID).then(result => setSelf(result));
                }
            }, {element_id: groupID})
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("account", {element_id: groupID});
            };
        }
    ]
})

export const groupAccountByID = selectorFamily({
    key: "groupAccountByID",
    get: ({groupID, accountID}) => async ({get}) => {
        const accounts = get(groupAccounts(groupID));
        return accounts?.find(account => account.account_id === accountID);
    }
})

const fetchGroupInvites = async groupID => {
    return await ws.call("group_invite_list", {
        authtoken: fetchToken(),
        group_id: groupID,
        only_mine: false,
    });
}

export const groupInviteTokens = atomFamily({
    key: "groupInviteTokens",
    default: selectorFamily({
        key: "groupInviteTokens/default",
        get: groupID => async ({get}) => {
            return await fetchGroupInvites(groupID);
        }
    }),
    effects_UNSTABLE: groupID => [
        ({setSelf, trigger}) => {
            ws.subscribe(fetchToken(), "group_invite", ({element_id}) => {
                if (element_id === groupID) {
                    console.log("reloading group invites")
                    fetchGroupInvites(groupID).then(result => setSelf(result));
                }
            }, {element_id: groupID})
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group_invite", {element_id: groupID});
            };
        }
    ]
})

const fetchGroupLog = async groupID => {
    return await ws.call("group_log_get", {
        authtoken: fetchToken(),
        group_id: groupID,
        from_id: 0,
    });
}

export const groupLog = atomFamily({
    key: "groupLog",
    default: selectorFamily({
        key: "groupLog/default",
        get: groupID => async ({get}) => {
            return await fetchGroupLog(groupID);
        }
    }),
    effects_UNSTABLE: groupID => [
        ({setSelf, trigger}) => {
            ws.subscribe(fetchToken(), "group_log", ({element_id}) => {
                if (element_id === groupID) {
                    console.log("reloading group log")
                    fetchGroupLog(groupID).then(result => setSelf(result));
                }
            }, {element_id: groupID})
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("group_log", {element_id: groupID});
            };
        }
    ]
})

export const createGroup = async ({name, description}) => {
    return await ws.call("group_create", {
        authtoken: fetchToken(),
        name: name,
        description: description,
        terms: "",
        currency_symbol: "€",
    });
}

export const deleteGroup = async ({groupID}) => {
    return await ws.call("delete_group", {
        authtoken: fetchToken(),
        group: groupID,
    });
}

export const setGroupMemberPrivileges = async ({groupID, userID, canWrite, isOwner}) => {
    return await ws.call("group_member_privileges_set", {
        authtoken: fetchToken(),
        group_id: groupID,
        user_id: userID,
        can_write: canWrite === undefined ? null : canWrite,
        is_owner: isOwner === undefined ? null : isOwner,
    });
}

export const updateGroupMetadata = async ({groupID, name, description, currencySymbol, terms}) => {
    let args = {
        authtoken: fetchToken(),
        group_id: groupID,
    };
    if (name != null) {
        args.name = name;
    }
    if (description != null) {
        args.description = description;
    }
    if (currencySymbol != null) {
        args.currency_symbol = currencySymbol;
    }
    if (terms != null) {
        args.terms = terms;
    }
    return await ws.call("group_metadata_set", args);
}

export const createGroupLog = async ({groupID, message}) => {
    return await ws.call("group_log_post", {
        authtoken: fetchToken(),
        group_id: groupID,
        message: message,
    });
}

export const createInviteToken = async ({groupID, description, validUntil, singleUse}) => {
    return await ws.call("group_invite_create", {
        authtoken: fetchToken(),
        group_id: groupID,
        description: description,
        valid_until: validUntil,
        single_use: singleUse,
    });
}

export const deleteInviteToken = async ({groupID, tokenID}) => {
    return await ws.call("group_invite_delete", {
        authtoken: fetchToken(),
        group_id: groupID,
        invite_id: tokenID,
    });
}

export const createAccount = async ({groupID, name, description}) => {
    return await ws.call("account_create", {
        authtoken: fetchToken(),
        group_id: groupID,
        name: name,
        description: description,
    });
}

export const editAccount = async ({groupID, accountID, name, description}) => {
    return await ws.call("account_edit", {
        authtoken: fetchToken(),
        group_id: groupID,
        account_id: accountID,
        name: name,
        description: description,
    });
}

