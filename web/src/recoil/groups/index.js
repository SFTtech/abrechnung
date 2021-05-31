import {atom, atomFamily, selector, selectorFamily} from "recoil";
import {ws} from "../../websocket";
import {sessionToken} from "../auth";

export const groupList = atom({
    key: "groupList",
    default: selector({
        key: "groupList/default",
        get: async ({get}) => {
            return await ws.call("group_list", {
                authtoken: get(sessionToken),
            });
        }
    })
})

export const groupById = atomFamily({
    key: "groupById",
    default: selectorFamily({
        key: "groupById/default",
        get: groupID => async ({get}) => {
            const metadata = (await ws.call("group_metadata_get", {
                authtoken: get(sessionToken),
                group_id: groupID,
            }))[0];
            return {
                ...get(groupList).find(group => group.group_id === groupID),
                ...metadata
            }
        }
    })
})

export const groupMembers = atomFamily({
    key: "groupMembers",
    default: selectorFamily({
        key: "groupMembers/default",
        get: groupID => async ({get}) => {
            return await ws.call("group_member_list", {
                authtoken: get(sessionToken),
                group_id: groupID,
            });
        }
    })
})

export const groupAccounts = atomFamily({
    key: "groupAccounts",
    default: selectorFamily({
        key: "groupAccounts/default",
        get: groupID => async ({get}) => {
            return await ws.call("account_list", {
                authtoken: get(sessionToken),
                group_id: groupID,
            });
        }
    })
})

export const groupAccountByID = selectorFamily({
    key: "groupAccountByID",
    get: ({groupID, accountID}) => async ({get}) => {
        const accounts = get(groupAccounts(groupID));
        return accounts?.find(account => account.account_id === accountID);
    }
})

export const groupInviteTokens = atomFamily({
    key: "groupInviteTokens",
    default: selectorFamily({
        key: "groupInviteTokens/default",
        get: groupID => async ({get}) => {
            console.log(groupID)
            return await ws.call("group_invite_list", {
                authtoken: get(sessionToken),
                group_id: groupID,
                only_mine: false,
            });
        }
    })
})

export const groupLog = atomFamily({
    key: "groupLog",
    default: selectorFamily({
        key: "groupLog/default",
        get: groupID => async ({get}) => {
            return await ws.call("group_log_get", {
                authtoken: get(sessionToken),
                group_id: groupID,
                from_id: 0,
            });
        }
    })
})


export const createGroup = async ({sessionToken, name, description}) => {
    const groupID = (await ws.call("group_create", {
        authtoken: sessionToken,
        name: name,
        description: description,
        terms: "",
        currency_symbol: "€",
    }))[0].group_id;
    // TODO: make this return the actual thingy
    return {
        group_id: groupID,
        name: name,
        description: description,
        currency_symbol: "€",
        terms: ""
    }
}

export const deleteGroup = async ({sessionToken, groupID}) => {
    return await ws.call("delete_group", {
        authtoken: sessionToken,
        group: groupID,
    });
}

export const setGroupMemberPrivileges = async ({sessionToken, groupID, userID, canWrite, isOwner}) => {
    return ws
        .call("group_member_privileges_set", {
            authtoken: sessionToken,
            group_id: groupID,
            usr: userID,
            can_write: canWrite === undefined ? null : canWrite,
            is_owner: isOwner === undefined ? null : isOwner,
        });
}

export const updateGroupMetadata = async ({sessionToken, groupID, name, description, currency_symbol, terms}) => {
    return ws.call("group_metadata_set", {
        authtoken: sessionToken,
        group_id: groupID,
        name: name === undefined ? null : name,
        description: description === undefined ? null : description,
        terms: terms === undefined ? null : terms,
        currency_symbol: currency_symbol === undefined ? null : currency_symbol,
    });
}

export const createGroupLog = ({sessionToken, groupID, message}) => {
    return ws.call("group_log_post", {
        authtoken: sessionToken,
        group_id: groupID,
        message: message,
    });
}

export const createInviteToken = async ({sessionToken, groupID, description, validUntil, singleUse}) => {
    const inviteToken = (await ws.call("group_invite_create", {
        authtoken: sessionToken,
        group_id: groupID,
        description: description,
        valid_until: validUntil,
        single_use: singleUse,
    }))[0];
    return {
        ...inviteToken,
        valid_until: validUntil,
        description: description,
        single_use: singleUse,
    }
}

export const deleteInviteToken = async ({sessionToken, groupID, tokenID}) => {
    return await ws.call("group_invite_delete", {
        authtoken: sessionToken,
        group_id: groupID,
        invite_id: tokenID,
    });
}

export const createAccount = async ({sessionToken, groupID, name, description}) => {
    const accountID = (await ws.call("account_create", {
        authtoken: sessionToken,
        group_id: groupID,
        name: name,
        description: description,
    }))[0].account_id;
    // TODO: make this return the actual thingy
    return {
        account_id: accountID,
        name: name,
        description: description,
    }
}

