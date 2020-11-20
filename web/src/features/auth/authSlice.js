import {createSlice} from '@reduxjs/toolkit';
import {ws} from '../../websocket';

export const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionToken: null,
        sessionName: "test-session"
    },
    reducers: {
        login: (state, action) => {
            ws.call("test-id", "login_with_password", {
                session: state.sessionName,
                username: action.payload.username,
                password: action.payload.password
            }, loggedInCallback);
            state.isLoading = true;
        },
        loggedIn: (state, action) => {
            console.log(action);
        },
        register: (state, action) => {

        },
        registered: (state, action) => {

        },
        logout: (state) => {

        },
        loggedOut: (state) => {

        },
    },
});

export const {login, register, loggedIn, registered, logout, loggedOut} = authSlice.actions;

const loggedInCallback = msg => dispatch => {
    console.log("dispatched logged in");
    dispatch(loggedIn(msg));
}


export default authSlice.reducer;
