import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {ofType} from "redux-observable";
import {map} from "rxjs/operators";

import {ws} from "../websocket";

export const login = createAsyncThunk("auth/login", async ({username, password, sessionName}, {dispatch}) => {
    return ws.call("login_with_password", {
        session: sessionName,
        username: username,
        password: password,
    });
    // TODO: think about how to chain actions
    // .then((val) => {
    //     dispatch(fetchUserInfo());
    // });
});

export const logout = createAsyncThunk("auth/logout", async (_, {getState}) => {
    return ws.call("logout", {
        authtoken: getState().auth.sessionToken,
    });
});

export const initSession = createAsyncThunk("auth/initSession", async (_, {dispatch}) => {
    if (
        localStorage.getItem("sessionToken") !== null &&
        localStorage.getItem("sessionToken") !== undefined &&
        localStorage.getItem("sessionToken") !== ""
    ) {
        const token = localStorage.getItem("sessionToken");
        const sessionName = localStorage.getItem("sessionName");
        dispatch(initSessionData({sessionToken: token, sessionName: sessionName}));
        return ws.call("get_user_info", {
            authtoken: token,
        });
    }
    throw Error("no session token found");
});

export const fetchUserInfo = createAsyncThunk("auth/fetchUserInfo", async (_, {getState}) => {
    return ws.call("get_user_info", {
        authtoken: getState().auth.sessionToken,
    });
});

export const authSlice = createSlice({
    name: "auth",
    initialState: {
        user: null,
        status: "init", // or idle, loading, failed
        isAuthenticated: false,
        error: null,
        sessionToken: null,
        sessionName: null,
    },
    reducers: {
        initSessionData: (state, action) => {
            state.sessionToken = action.payload.sessionToken;
            state.sessionName = action.payload.sessionName;
        },
    },
    extraReducers: {
        [login.fulfilled]: (state, action) => {
            state.status = "idle";
            state.isAuthenticated = true;
            state.sessionToken = action.payload[0].token;
            state.sessionName = action.meta.arg.sessionName;
            state.error = null;
            localStorage.setItem("sessionToken", state.sessionToken);
            localStorage.setItem("sessionName", action.meta.arg.sessionName);
        },
        [login.pending]: (state) => {
            state.status = "loading";
        },
        [login.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "failed";
        },
        [logout.fulfilled]: (state, action) => {
            state.sessionToken = null;
            localStorage.removeItem("sessionToken");
            state.status = "idle";
            state.isAuthenticated = false;
            state.user = null;
            state.error = null;
        },
        [logout.rejected]: (state, action) => {
            state.sessionToken = null;
            localStorage.removeItem("sessionToken");
            state.status = "idle";
            state.isAuthenticated = false;
            state.user = null;
            state.error = null;
        },
        [fetchUserInfo.fulfilled]: (state, action) => {
            state.user = action.payload[0];
            state.status = "idle";
            state.error = null;
        },
        [fetchUserInfo.pending]: (state, action) => {
            state.status = "loading";
        },
        [fetchUserInfo.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "failed";
        },
        [initSession.fulfilled]: (state, action) => {
            state.user = action.payload[0];
            state.isAuthenticated = true;
            state.status = "idle";
            state.error = null;
        },
        [initSession.pending]: (state, action) => {
            // state.status = 'loading';
        },
        [initSession.rejected]: (state, action) => {
            state.status = "idle";
        },
    },
});

export const {initSessionData} = authSlice.actions;

export const authEpic = (action$, state$) => action$.pipe(
    ofType("auth/login/fulfilled"),
    map(() => fetchUserInfo())
)

export default authSlice.reducer;
