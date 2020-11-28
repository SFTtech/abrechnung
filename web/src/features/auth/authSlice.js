import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import {ws} from '../../websocket';

export const login = createAsyncThunk('auth/login', async ({username, password, sessionName}) => {
    return ws.call("login_with_password", {
        session: sessionName,
        username: username,
        password: password
    });
})

export const logout = createAsyncThunk('auth/logout', async (_, {getState}) => {
    return ws.call("logout", {
        authtoken: getState().auth.sessionToken
    });
})

export const initSession = createAsyncThunk('auth/initSession', async (_, {dispatch}) => {
    if (localStorage.getItem("sessionToken") !== null && localStorage.getItem("sessionToken") !== undefined && localStorage.getItem("sessionToken") !== "") {
        const token = localStorage.getItem("sessionToken");
        const sessionName = localStorage.getItem("sessionName");
        dispatch(initSessionData({sessionToken: token, sessionName: sessionName}));
        return ws.call("get_user_info", {
            authtoken: token
        });
    }
    throw Error("no session token found");
})

export const fetchUserInfo = createAsyncThunk('auth/fetchUserInfo', async (_, {getState}) => {
    return ws.call("get_user_info", {
        authtoken: getState().auth.sessionToken
    });
})

export const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        status: 'init', // or idle, loading, failed
        isAuthenticated: false,
        error: null,
        sessionToken: null,
        sessionName: null,
    },
    reducers: {
        initSessionData: (state, action) => {
            state.sessionToken = action.payload.sessionToken;
            state.sessionName = action.payload.sessionName;
        }
    },
    extraReducers: {
        [login.fulfilled]: (state, action) => {
            state.status = 'idle';
            state.isAuthenticated = true;
            state.sessionToken = action.payload[0].token; // this is not pretty ...
            state.sessionName = action.meta.arg.sessionName;
            state.error = null;
            localStorage.setItem("sessionToken", state.sessionToken);
            localStorage.setItem("sessionName", action.meta.arg.sessionName);
            console.log("logged in with session token", state.sessionToken);
        },
        [login.pending]: (state) => {
            state.status = 'loading';
        },
        [login.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = 'failed';
        },
        [logout.fulfilled]: (state, action) => {
            console.log('logged out successfully');
            state.sessionToken = null;
            localStorage.removeItem("sessionToken");
            state.status = 'idle';
            state.isAuthenticated = false;
            state.user = null;
            state.error = null;
        },
        [logout.rejected]: (state, action) => {
            console.log("error on logout - do something")
            state.sessionToken = null;
            localStorage.removeItem("sessionToken");
            state.status = 'idle';
            state.isAuthenticated = false;
            state.user = null;
            state.error = null;
        },
        [fetchUserInfo.fulfilled]: (state, action) => {
            state.user = action.payload[0];
            console.log("received user info", state.user)
            state.status = 'idle';
            state.error = null;
        },
        [fetchUserInfo.pending]: (state, action) => {
            state.status = 'loading';
        },
        [fetchUserInfo.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = 'failed';
        },
        [initSession.fulfilled]: (state, action) => {
            state.user = action.payload[0];
            console.log("initialized session with user", state.user)
            state.isAuthenticated = true;
            state.status = 'idle';
            state.error = null;
        },
        [initSession.pending]: (state, action) => {
            state.status = 'loading';
        },
        [initSession.rejected]: (state, action) => {
            state.status = 'idle';
        },
    }
});

export const {initSessionData} = authSlice.actions;

export default authSlice.reducer;
