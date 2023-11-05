import { Api, Session, User } from "@abrechnung/api";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { PURGE } from "redux-persist";
import { AuthSliceState } from "../types";

const initialState: AuthSliceState = {
    baseUrl: undefined,
    accessToken: undefined,
    profile: undefined,
    activeInstanceId: 0,
};

// selectors
export const selectAccessToken = (args: { state: AuthSliceState }): string | undefined => {
    const { state } = args;
    return state.accessToken;
};

export const selectBaseUrl = (args: { state: AuthSliceState }): string | undefined => {
    const { state } = args;
    return state.baseUrl;
};

export const selectIsAuthenticated = (args: { state: AuthSliceState }): boolean => {
    const { state } = args;
    return state.accessToken !== undefined && state.baseUrl !== undefined;
};

export const selectProfile = (args: { state: AuthSliceState }): User | undefined => {
    const { state } = args;
    return state.profile;
};

export const selectCurrentUserId = (args: { state: AuthSliceState }): number | undefined => {
    const { state } = args;
    return state.profile?.id;
};

export const selectIsGuestUser = (args: { state: AuthSliceState }): boolean | undefined => {
    const { state } = args;
    if (state.profile === undefined) {
        return undefined;
    }
    return state.profile.is_guest_user;
};

export const selectLoginSessions = (args: { state: AuthSliceState }): Session[] => {
    const { state } = args;
    if (state.profile === undefined) {
        return [];
    }
    return state.profile.sessions;
};

// async thunks
export const fetchProfile = createAsyncThunk<User, { api: Api }>("fetchProfile", async ({ api }) => {
    return await api.client.auth.getProfile();
});

export const login = createAsyncThunk<
    { profile: User; accessToken: string; baseUrl: string },
    { username: string; password: string; sessionName: string; api: Api }
>("login", async ({ username, password, sessionName, api }) => {
    const loginResp = await api.client.auth.login({ requestBody: { username, password, session_name: sessionName } });
    api.init(loginResp.access_token);
    const profile = await api.client.auth.getProfile();
    return { profile: profile, accessToken: loginResp.access_token, baseUrl: api.getBaseApiUrl() };
});

export const logout = createAsyncThunk<void, { api: Api }>("logout", async ({ api }, { dispatch }) => {
    if (await api.hasConnection()) {
        try {
            await api.client.auth.logout();
        } catch (err) {
            console.error("Unexpected error occured while trying to logout.", err);
        }
    }
    console.log("purging state");
    api.resetAuthState();
    dispatch({
        type: PURGE,
        result: (purgeResult: any) => {
            console.log("successfully purged state", purgeResult);
            return;
        },
    });
});

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(fetchProfile.fulfilled, (state, action) => {
            state.profile = action.payload;
        });
        builder.addCase(login.fulfilled, (state, action) => {
            const { profile, accessToken, baseUrl } = action.payload;
            state.profile = profile;
            state.accessToken = accessToken;
            state.baseUrl = baseUrl;
        });
        builder.addCase(logout.fulfilled, (state, action) => {
            state.profile = undefined;
            state.accessToken = undefined;
        });
    },
});

//export const {} = authSlice.actions;

export const { reducer: authReducer } = authSlice;
