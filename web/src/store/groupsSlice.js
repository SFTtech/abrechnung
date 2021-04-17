import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";

import {ws} from "../websocket";
import {ofType} from "redux-observable";
import {map, withLatestFrom} from "rxjs/operators";

export const fetchGroups = createAsyncThunk("groups/fetchGroups", async (_, {getState}) => {
    return ws.call("group_list", {
        authtoken: getState().auth.sessionToken,
    });
});

export const createGroup = createAsyncThunk("groups/createGroup", async ({name, description}, {getState}) => {
    return ws.call("group_create", {
        authtoken: getState().auth.sessionToken,
        name: name,
        description: description,
        terms: "",
        currency_symbol: "€",
    });
});

export const deleteGroup = createAsyncThunk("groups/deleteGroup", async ({groupID}, {getState}) => {
    return ws.call("delete_group", {
        authtoken: getState().auth.sessionToken,
        group: groupID,
    });
});

export const fetchGroupMembers = createAsyncThunk("groups/fetchGroupMembers", async ({groupID}, {getState}) => {
    return ws.call("group_member_list", {
        authtoken: getState().auth.sessionToken,
        group_id: groupID,
    });
});

export const fetchGroupMetadata = createAsyncThunk("groups/fetchGroupMetadata", async ({groupID}, {getState}) => {
    return ws.call("group_metadata_get", {
        authtoken: getState().auth.sessionToken,
        group_id: groupID,
    });
});
export const setGroupMemberPrivileges = createAsyncThunk(
    "groups/setGroupMemberPrivileges",
    async ({groupID, userID, canWrite, isOwner}, {getState, dispatch}) => {
        return ws
            .call("group_member_privileges_set", {
                authtoken: getState().auth.sessionToken,
                group_id: groupID,
                usr: userID,
                can_write: canWrite === undefined ? null : canWrite,
                is_owner: isOwner === undefined ? null : isOwner,
            });
    }
);

export const updateGroupMetadata = createAsyncThunk(
    "groups/updateGroupMetadata",
    async ({groupID, name, description, currency_symbol, terms}, {getState}) => {
        return ws.call("group_metadata_set", {
            authtoken: getState().auth.sessionToken,
            group_id: groupID,
            name: name === undefined ? null : name,
            description: description === undefined ? null : description,
            terms: terms === undefined ? null : terms,
            currency_symbol: currency_symbol === undefined ? null : currency_symbol,
        });
    }
);

export const fetchGroupLog = createAsyncThunk("groups/fetchGroupLog", async ({groupID, fromID}, {getState}) => {
    return ws.call("group_log_get", {
        authtoken: getState().auth.sessionToken,
        group_id: groupID,
        from_id: fromID !== undefined ? fromID : 0,
    });
});

export const refreshGroupLog = (groupID) => {
    return (dispatch, getState) => {
        if (getState().groups.entities[groupID].log === undefined) {
            dispatch(fetchGroupLog({groupID: groupID, fromID: 0}));
        } else {
            const log = getState().groups.entities[groupID].log;
            dispatch(fetchGroupLog({groupID: groupID, fromID: log[log.length - 1].id + 1}));
        }
    };
};

export const createGroupLog = createAsyncThunk("groups/createGroupLog", async ({groupID, message}, {
    getState,
    dispatch
}) => {
    return ws
        .call("group_log_post", {
            authtoken: getState().auth.sessionToken,
            group_id: groupID,
            message: message,
        });
});

export const fetchInviteTokens = createAsyncThunk("groups/fetchInviteTokens", async ({groupID}, {getState}) => {
    return ws.call("group_invite_list", {
        authtoken: getState().auth.sessionToken,
        group_id: groupID,
        only_mine: false,
    });
});

export const createInviteToken = createAsyncThunk(
    "groups/createInviteToken",
    async ({
               groupID,
               description,
               validUntil,
               singleUse
           }, {getState, dispatch}) => {
        return ws.call("group_invite_create", {
            authtoken: getState().auth.sessionToken,
            group_id: groupID,
            description: description,
            valid_until: validUntil,
            single_use: singleUse,
        });
    });

export const deleteInviteToken = createAsyncThunk("groups/deleteInviteToken", async ({groupID, tokenID}, {
    getState,
    dispatch
}) => {
    return ws.call("group_invite_delete", {
        authtoken: getState().auth.sessionToken,
        group_id: groupID,
        invite_id: tokenID,
    });
});

// account handling
export const fetchAccounts = createAsyncThunk("groups/fetchAccounts", async ({groupID}, {getState}) => {
    return ws.call("account_list", {
        authtoken: getState().auth.sessionToken,
        group_id: groupID,
    });
});

export const createAccount = createAsyncThunk(
    "groups/createAccount",
    async ({
               groupID,
               name,
               description
           }, {getState}) => {
        return ws.call("account_create", {
            authtoken: getState().auth.sessionToken,
            group_id: groupID,
            name: name,
            description: description,
        });
    });

// transaction handling
export const fetchTransactions = createAsyncThunk("groups/fetchTransactions", async ({groupID}, {getState}) => {
    return ws.call("transaction_list", {
        authtoken: getState().auth.sessionToken,
        group_id: groupID,
    });
});

export const createTransaction = createAsyncThunk(
    "groups/createTransaction",
    async ({
               groupID,
               type,
               description,
               currencySymbol,
               currencyConversionRate,
               value
           }, {getState}) => {
        return ws.call("transaction_create", {
            authtoken: getState().auth.sessionToken,
            group_id: groupID,
            type: type,
            description: description,
            currency_symbol: currencySymbol,
            currency_conversion_rate: currencyConversionRate,
            value: value,
        });
    });

const groupComparer = (a, b) => a.name.localeCompare(b.name);

export const groupsSlice = createSlice({
    name: "groups",
    initialState: {
        ids: [],
        entities: {},
        status: "loading", // or loading | failed
        error: null,
    },
    extraReducers: {
        [fetchGroups.fulfilled]: (state, action) => {
            // TODO: more sophisticated merging of group data to not overwrite existing member info
            // alternatively force a full reload (which might lead to more consistency)
            for (const group of action.payload) {
                if (!(group.group_id in state.entities)) {
                    state.ids.push(group.group_id);
                    state.ids = state.ids.sort(groupComparer);
                }
                state.entities[group.group_id] = group;
            }
            state.status = "idle";
            state.error = null;
        },
        [fetchGroups.pending]: (state, action) => {
            state.status = "loading";
        },
        [fetchGroups.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "failed";
        },
        [createGroup.fulfilled]: (state, action) => {
            let group = {
                group_id: action.payload[0].group_id,
                name: action.meta.arg.name,
                description: action.meta.arg.description,
                terms: action.meta.arg.terms,
                currency_symbol: action.meta.arg.currency_symbol,
            };
            state.ids.push(group.group_id);
            state.ids = state.ids.sort(groupComparer);
            state.entities[group.group_id] = group;
            state.status = "idle";
            state.error = null;
        },
        [createGroup.rejected]: (state, action) => {
            state.error = action.error.message;
        },
        [deleteGroup.fulfilled]: (state, action) => {
            delete state.entities[action.meta.arg.groupID];
            state.ids = state.ids.filter((group) => group.group_id !== action.meta.arg.groupID);
            state.status = "idle";
            state.error = null;
        },
        [deleteGroup.rejected]: (state, action) => {
            state.error = action.error.message;
        },
        [fetchGroupMembers.fulfilled]: (state, action) => {
            state.entities[action.meta.arg.groupID].members = action.payload;
            state.status = "idle";
            state.error = null;
        },
        [fetchGroupMembers.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "idle";
        },
        [fetchGroupMetadata.fulfilled]: (state, action) => {
            const id = action.meta.arg.groupID;
            if (id in state.entities) {
                state.entities[id] = {
                    ...state.entities[id],
                    ...action.payload[0]
                };
            } else {
                state.entities[id] = {
                    group_id: id,
                    ...action.payload
                }
                state.ids.push(id);
                state.ids = state.ids.sort(groupComparer);
            }
            state.status = "idle";
            state.error = null;
        },
        [fetchGroupMetadata.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "idle";
        },
        [updateGroupMetadata.fulfilled]: (state, action) => {
            // TODO
            state.status = "idle";
            state.error = null;
        },
        [updateGroupMetadata.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "idle";
        },
        [setGroupMemberPrivileges.fulfilled]: (state, action) => {
            const groupID = action.meta.arg.groupID
            if (state.entities[groupID] !== undefined) {
                const memberIdx = state.entities[groupID].members.find((member) => member.id === action.meta.arg.userID);
                if (memberIdx >= 0) {
                    state.entities[groupID].members[memberIdx].can_write = action.meta.arg.canWrite;
                    state.entities[groupID].members[memberIdx].is_owner = action.meta.arg.isOwner;
                }
            }
            state.status = "idle";
            state.error = null;
        },
        [setGroupMemberPrivileges.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "idle";
        },
        [fetchGroupLog.fulfilled]: (state, action) => {
            const groupID = action.meta.arg.groupID
            if (state.entities[groupID] !== undefined) {
                // TODO more sophisticated merging of log fetching
                state.entities[groupID].log = action.payload.sort((left, right) => left.id < right.id);
            }
            state.status = "idle";
            state.error = null;
        },
        [fetchGroupLog.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "idle";
        },
        [createGroupLog.fulfilled]: (state, action) => {
            // TODO: would like to get the created object back from the API
            state.status = "idle";
            state.error = null;
        },
        [createGroupLog.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "idle";
        },
        [fetchInviteTokens.fulfilled]: (state, action) => {
            const groupID = action.meta.arg.groupID
            if (state.entities[groupID] !== undefined) {
                // TODO more sophisticated merging of log fetching
                state.entities[groupID].tokens = action.payload;
            }
            state.status = "idle";
            state.error = null;
        },
        [fetchInviteTokens.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "idle";
        },
        [createInviteToken.fulfilled]: (state, action) => {
            const groupID = action.meta.arg.groupID
            if (state.entities[groupID] !== undefined) {
                state.entities[groupID].tokens.push({
                    // TODO: id: action.payload...
                    valid_until: JSON.stringify(action.meta.arg.validUntil),
                    description: action.meta.arg.description,
                    single_use: action.meta.arg.singleUse,
                    token: action.payload[0].token,
                })
            }
            state.status = "idle";
            state.error = null;
        },
        [createInviteToken.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "idle";
        },
        [deleteInviteToken.fulfilled]: (state, action) => {
            const groupID = action.meta.arg.groupID
            if (state.entities[groupID] !== undefined && state.entities[groupID].tokens !== undefined) {
                const index = state.entities[groupID].tokens.findIndex(value => value.id === action.meta.arg.tokenID);
                if (index > -1) {
                    state.entities[groupID].tokens.splice(index, 1);
                }
            }
            state.status = "idle";
            state.error = null;
        },
        [deleteInviteToken.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "idle";
        },
        [fetchAccounts.fulfilled]: (state, action) => {
            let group = state.entities[action.meta.arg.groupID];
            group.accounts = action.payload;
        },
        [fetchAccounts.pending]: (state, action) => {
            let group = state.entities[action.meta.arg.groupID];
            group.accounts = undefined;
        },
        [fetchAccounts.rejected]: (state, error) => {
            console.log(error);
        },
        [createAccount.fulfilled]: (state, action) => {
            let account = {
                id: action.payload[0].account_id,
                name: action.meta.arg.name,
                description: action.meta.arg.description,
            };
            let group = state.entities[action.meta.arg.groupID];
            group.accounts.push(account);
        },
        [fetchTransactions.fulfilled]: (state, action) => {
            let group = state.entities[action.meta.arg.groupID];
            group.transactions = action.payload;
        },
        [fetchTransactions.pending]: (state, action) => {
            let group = state.entities[action.meta.arg.groupID];
            group.transactions = undefined;
        },
        [fetchTransactions.rejected]: (state, error) => {
            console.log(error);
        },
        [createTransaction.fulfilled]: (state, action) => {
            let transaction = {
                id: action.payload[0].transaction_id,
                currency_symbol: action.meta.arg.currencySymbol,
                currency_conversion_rate: action.meta.arg.currencyConversionRate,
                value: action.meta.arg.value,
                type: action.meta.arg.type,
                change_id: action.payload[0].change_id
            };
            let group = state.entities[action.meta.arg.groupID];
            group.transactions.push(transaction);
        },
    },
});

// export const { } = groupsSlice.actions;

export const getAccountsForGroup = (state, groupID) => {
    if (groupID in state.entities) {
        return state.entities[groupID].accounts;
    }
    return undefined;
}

export const getTransactionsForGroup = (state, groupID) => {
    if (groupID in state.entities) {
        return state.entities[groupID].transactions;
    }
    return undefined;
}

export const groupsEpic = (action$, state$) => action$.pipe(
    ofType("groups/createInviteToken/fulfilled", "groups/deleteInviteToken/fulfilled", "groups/updateGroupMetadata/fulfilled", "groups/setGroupMemberPrivileges/fulfilled"),
    withLatestFrom(state$),
    map(action => {
        return refreshGroupLog(action[0].meta.arg.groupID)
    })
)

export default groupsSlice.reducer;
