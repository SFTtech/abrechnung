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

export const deleteGroup = createAsyncThunk("users/deleteGroup", async ({ group }, { getState }) => {
    return ws.call("delete_group", {
        authtoken: getState().auth.sessionToken,
        group: group,
    });
});

export const usersSlice = createSlice({
    name: "users",
    initialState: {
        users: [],
        groupInviteTokens: [
            {
                description: "fewff",
                single_use: false,
                valid_until: '"2020-12-09T23:00:00.000Z"',
                inviteToken: "05f6fbe4-1aa2-4ffc-bbf2-3241f3f35608",
            },
        ],
        groups: null,
        status: "loading", // or loading | failed
        error: null,
    },
    reducers: {
        createInviteLink: (state, action) => {
            state.groupInviteTokens.push(action.payload);
        },
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
            const deletedGroupID = action.meta.arg.group;
            state.sessions = state.sessions.filter((group) => group.id !== deletedGroupID);
            state.status = "idle";
            state.error = null;
        },
        [deleteGroup.rejected]: (state, action) => {
            state.error = action.error.message;
        },
    },
});

export const { createInviteLink } = usersSlice.actions;

export default usersSlice.reducer;
