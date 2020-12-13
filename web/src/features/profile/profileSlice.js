import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { ws } from "../../websocket";

export const renameSession = createAsyncThunk("profile/renameSession", async ({ session, new_name }, { getState }) => {
    return ws.call("rename_session", {
        authtoken: getState().auth.sessionToken,
        session: session,
        new_name: new_name,
    });
});

export const deleteSession = createAsyncThunk("profile/deleteSession", async ({ session }, { getState }) => {
    return ws.call("logout_session", {
        authtoken: getState().auth.sessionToken,
        session: session,
    });
});

export const fetchSessionInfo = createAsyncThunk("profile/fetchSessionInfo", async (_, { getState }) => {
    return ws.call("list_sessions", {
        authtoken: getState().auth.sessionToken,
    });
});

export const profileSlice = createSlice({
    name: "profile",
    initialState: {
        status: "idle", // or loading, failed
        error: null,
        sessions: null,
    },
    reducers: {},
    extraReducers: {
        [fetchSessionInfo.fulfilled]: (state, action) => {
            state.sessions = action.payload;
            state.status = "idle";
            state.error = null;
        },
        [fetchSessionInfo.pending]: (state, action) => {
            state.status = "loading";
        },
        [fetchSessionInfo.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "failed";
        },
        [deleteSession.fulfilled]: (state, action) => {
            const deletedSessionID = action.meta.arg.session;
            state.sessions = state.sessions.filter((session) => session.id !== deletedSessionID);
            state.status = "idle";
            state.error = null;
        },
        [deleteSession.rejected]: (state, action) => {
            state.error = action.error.message;
        },
        [renameSession.fulfilled]: (state, action) => {
            const renamedSessionName = action.meta.arg.new_name;
            const renamedSessionID = action.meta.arg.session;
            state.sessions = state.sessions.map((session) => {
                if (session.id === renamedSessionID) {
                    return {
                        ...session,
                        name: renamedSessionName,
                    };
                } else {
                    return session;
                }
            });
            state.error = null;
        },
        [renameSession.rejected]: (state, action) => {
            state.error = action.error.message;
        },
    },
});

// export const {} = profileSlice.actions;

export default profileSlice.reducer;
