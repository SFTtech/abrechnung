import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import {ws} from '../../websocket';
import {createError} from '../messages/messagesSlice'

// export const login = (username, password) => (dispatch, getState) => {
//     dispatch(beginLogin());
//     ws.call("login_with_password", {
//         session: getState().auth.sessionName,
//         username: username,
//         password: password
//     }, (msg) => {
//         dispatch(loggedIn(msg))
//     });
// }

export const login = createAsyncThunk('auth/login', async (payload, thunkAPI) => {
    return ws.call("login_with_password", {
        session: thunkAPI.getState().auth.sessionName,
        username: payload.username,
        password: payload.password
    });
})

export const logout = () => (dispatch, getState) => {
    if (getState().auth.sessionToken === null) {
        return;
    }
    ws.call("logout", {
        authtoken: getState().auth.sessionToken,
    }, (msg) => {
        dispatch(loggedOut(msg))
    });
    dispatch(beginLogin());
}

export const getUserInfo = () => (dispatch, getState) => {
    if (getState().auth.sessionToken === null) {
        dispatch(createError({msg: "Error, not logged in", status: 403}));
        return;
    }
    ws.call("get_user_info", {
        authtoken: getState().auth.sessionToken,
    }, (msg) => {
        dispatch(receiveUserInfo(msg))
    });
}

export const register = (username, email, password) => dispatch => {
    dispatch(beginRegister());
    ws.call("register_user", {
        email: email,
        username: username,
        password: password
    }, (msg) => {
        dispatch(registered(msg))
    });
}


export const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        status: 'idle', // or loading, authenticated, failed, pending_registration
        error: null,
        sessionToken: null,
        sessionName: "test-session" // TODO: not hardcode
    },
    reducers: {
        beginLogin: (state, action) => {
            state.status = 'loading';
        },
        loggedIn: (state, action) => {
            if (action.payload.type === 'call-result') {
                state.status = 'authenticated';
                state.sessionToken = action.payload.data[0][0]; // this is not pretty ...
            } else {
                // TODO: error handling
                state.status = 'failed';
            }
            console.log("logged in with session token", state.sessionToken);
        },
        receiveUserInfo: (state, action) => {
            if (action.payload.type === 'call-result') {
                state.user = action.payload.data // reconstruct from the received columns
            } else {
                // TODO: error handling
            }
        },
        beginRegister: state => {
            state.status = 'loading';
        },
        registered: (state, action) => {
            if (action.payload.type === 'call-result') {
                state.status = 'pending_registration';
            } else {
                // TODO: error handling
                state.status = 'failed';
            }
            console.log("registered, now pending registration");
        },
        beginLogout: (state) => {
            state.sessionToken = null;
            state.status = 'idle';
            state.user = null;
            state.error = null;
        },
        loggedOut: (state, action) => {
            if (action.payload.type === 'call-result') {
                console.log('logged out successfully');
            } else {
                // TODO: error handling
            }
        },
    },
    extraReducers: {
        [login.fulfilled]: (state, action) => {

        },
        [login.pending]: (state, action) => {
            state.status = 'loading';
        }
    }
});

export const {beginLogin, beginRegister, loggedIn, registered, receiveUserInfo, beginLogout, loggedOut} = authSlice.actions;

export default authSlice.reducer;
