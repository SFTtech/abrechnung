import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ws } from "../../websocket";

export const fetchGroups = createAsyncThunk("users/fetchGroups", async (_, { getState }) => {
    return ws.call("group_list", {
        authtoken: getState().auth.sessionToken,
    });
});

export const createGroup = createAsyncThunk("users/createGroup", async ({ name, description }, { getState }) => {
    return ws.call("group_create", {
        authtoken: getState().auth.sessionToken,
        name: name,
        description: description,
        terms: "",
        currency: "€",
    });
});

export const deleteGroup = createAsyncThunk("users/deleteGroup", async ({ groupID }, { getState }) => {
    return ws.call("delete_group", {
        authtoken: getState().auth.sessionToken,
        group: groupID,
    });
});

export const fetchGroupMembers = createAsyncThunk("users/fetchGroupMembers", async ({ groupID }, { getState }) => {
    return ws.call("group_member_list", {
        authtoken: getState().auth.sessionToken,
        group_id: groupID,
    });
});

export const fetchGroupMetadata = createAsyncThunk("users/fetchGroupMetadata", async ({ groupID }, { getState }) => {
    return ws.call("group_metadata_get", {
        authtoken: getState().auth.sessionToken,
        group_id: groupID,
    });
});

export const setGroupMemberPrivileges = createAsyncThunk(
    "users/setGroupMemberPrivileges",
    async ({ groupID, userID, canWrite, isOwner }, { getState }) => {
        return ws.call("group_member_privileges_set", {
            authtoken: getState().auth.sessionToken,
            group_id: groupID,
            usr: userID,
            can_write: canWrite === undefined ? null : canWrite,
            is_owner: isOwner === undefined ? null : isOwner,
        });
    }
);

export const updateGroupMetadata = createAsyncThunk(
    "users/updateGroupMetadata",
    async ({ groupID, name, description, currency, terms }, { getState }) => {
        return ws.call("group_metadata_set", {
            authtoken: getState().auth.sessionToken,
            group_id: groupID,
            name: name === undefined ? null : name,
            description: description === undefined ? null : description,
            terms: terms === undefined ? null : terms,
            currency: currency === undefined ? null : currency,
        });
    }
);

export const usersSlice = createSlice({
    name: "users",
    initialState: {
        users: [],
        groups: null,
        status: "loading", // or loading | failed
        error: null,
    },
    extraReducers: {
        [fetchGroups.fulfilled]: (state, action) => {
            state.groups = action.payload;
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
                name: action.meta.arg.name,
                description: action.meta.arg.description,
                terms: action.meta.arg.terms,
                currency: action.meta.arg.currency,
            };
            group.id = action.payload[0].id;
            state.groups.push(group);
            state.status = "idle";
            state.error = null;
        },
        [createGroup.rejected]: (state, action) => {
            state.error = action.error.message;
        },
        [deleteGroup.fulfilled]: (state, action) => {
            const deletedGroupID = action.meta.arg.groupID;
            state.groups = state.groups.filter((group) => group.id !== deletedGroupID);
            state.status = "idle";
            state.error = null;
        },
        [deleteGroup.rejected]: (state, action) => {
            state.error = action.error.message;
        },
        [fetchGroupMembers.fulfilled]: (state, action) => {
            const idx = state.groups.findIndex((group) => group.id === action.meta.arg.groupID);
            if (idx >= 0) {
                state.groups[idx].members = action.payload;
            } else {
                state.groups.push({
                    ...action.payload,
                    id: action.meta.arg.groupID,
                });
            }
            state.status = "idle";
            state.error = null;
        },
        [fetchGroupMembers.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "idle";
        },
        [fetchGroupMetadata.fulfilled]: (state, action) => {
            const idx = state.groups.findIndex((group) => group.id === action.meta.arg.groupID);
            if (idx >= 0) {
                state.groups[idx] = {
                    ...state.groups[idx],
                    ...action.payload[0],
                };
            } else {
                state.groups.push({
                    ...action.payload[0],
                    id: action.meta.arg.groupID,
                });
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
            const idx = state.groups.findIndex((group) => group.id === action.meta.arg.groupID);
            if (idx >= 0) {
                const memberIdx = state.groups[idx].members.find((member) => member.id === action.meta.arg.userID);
                if (memberIdx >= 0) {
                    state.groups[idx].members[memberIdx].can_write = action.meta.arg.canWrite;
                    state.groups[idx].members[memberIdx].is_owner = action.meta.arg.isOwner;
                }
            }
            state.status = "idle";
            state.error = null;
        },
        [setGroupMemberPrivileges.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "idle";
        },
    },
});

// export const { } = usersSlice.actions;

export default usersSlice.reducer;
