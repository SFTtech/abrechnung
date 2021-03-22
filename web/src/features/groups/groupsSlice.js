import {createAsyncThunk, createEntityAdapter, createSlice} from "@reduxjs/toolkit";

import {ws} from "../../websocket";
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

export const createGroupLog = createAsyncThunk("groups/createGroupLog", async ({groupID, message}, {getState, dispatch}) => {
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

export const createInviteToken = createAsyncThunk("groups/createInviteToken", async ({groupID, description, validUntil, singleUse}, {getState, dispatch}) => {
    return ws.call("group_invite_create", {
        authtoken: getState().auth.sessionToken,
        group_id: groupID,
        description: description,
        valid_until: validUntil,
        single_use: singleUse,
    });
});

export const deleteInviteToken = createAsyncThunk("groups/deleteInviteToken", async ({groupID, tokenID}, {getState, dispatch}) => {
    return ws.call("group_invite_delete", {
        authtoken: getState().auth.sessionToken,
        group_id: groupID,
        invite_id: tokenID,
    });
});

const groupsAdapter = createEntityAdapter({
    // Sort groups by name
    sortComparer: (a, b) => a.name.localeCompare(b.name),
});

export const groupsSlice = createSlice({
    name: "groups",
    initialState: groupsAdapter.getInitialState({
        status: "loading", // or loading | failed
        error: null,
    }),
    extraReducers: {
        [fetchGroups.fulfilled]: (state, action) => {
            // TODO: more sophisticated merging of group data to not overwrite existing member info
            // alternatively force a full reload (which might lead to more consistency)
            groupsAdapter.upsertMany(state, action.payload);
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
                id: action.payload[0].id,
                name: action.meta.arg.name,
                description: action.meta.arg.description,
                terms: action.meta.arg.terms,
                currency_symbol: action.meta.arg.currency_symbol,
            };
            groupsAdapter.addOne(state, group);
            state.status = "idle";
            state.error = null;
        },
        [createGroup.rejected]: (state, action) => {
            state.error = action.error.message;
        },
        [deleteGroup.fulfilled]: (state, action) => {
            groupsAdapter.removeOne(state, action.meta.arg.groupID);
            state.status = "idle";
            state.error = null;
        },
        [deleteGroup.rejected]: (state, action) => {
            state.error = action.error.message;
        },
        [fetchGroupMembers.fulfilled]: (state, action) => {
            const group = {
                id: action.meta.arg.groupID,
                members: action.payload
            }
            groupsAdapter.upsertOne(state, group);
            state.status = "idle";
            state.error = null;
        },
        [fetchGroupMembers.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "idle";
        },
        [fetchGroupMetadata.fulfilled]: (state, action) => {
            const group = {
                id: action.meta.arg.groupID,
                ...action.payload[0],
            }
            groupsAdapter.upsertOne(state, group);
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
            // TODO: use groupsAdapter for this
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
    },
});

// export const { } = groupsSlice.actions;

export const groupsEpic = (action$, state$) => action$.pipe(
    ofType("groups/createInviteToken/fulfilled", "groups/deleteInviteToken/fulfilled", "groups/updateGroupMetadata/fulfilled", "groups/setGroupMemberPrivileges/fulfilled"),
    withLatestFrom(state$),
    map(action => {
        return refreshGroupLog(action[0].meta.arg.groupID)
    })
)

export default groupsSlice.reducer;
