import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { AuthSliceState } from "../types";
import { Session, User } from "@abrechnung/types";
import { Api } from "@abrechnung/api";
import memoize from "proxy-memoize";
import { PURGE } from "redux-persist";

const initialState: AuthSliceState = {
    baseUrl: undefined,
    sessionToken: undefined,
    profile: undefined,
    activeInstanceId: 0,
};

// selectors
export const selectSessionToken = memoize((args: { state: AuthSliceState }): string | undefined => {
    const { state } = args;
    return state.sessionToken;
});

export const selectBaseUrl = memoize((args: { state: AuthSliceState }): string | undefined => {
    const { state } = args;
    return state.baseUrl;
});

export const selectIsAuthenticated = memoize((args: { state: AuthSliceState }): boolean => {
    const { state } = args;
    return state.sessionToken !== undefined && state.baseUrl !== undefined;
});

export const selectProfile = memoize((args: { state: AuthSliceState }): User | undefined => {
    const { state } = args;
    return state.profile;
});

export const selectCurrentUserId = memoize((args: { state: AuthSliceState }): number | undefined => {
    const { state } = args;
    return state.profile?.id;
});

export const selectIsGuestUser = memoize((args: { state: AuthSliceState }): boolean | undefined => {
    const { state } = args;
    if (state.profile === undefined) {
        return undefined;
    }
    return state.profile.isGuestUser;
});

export const selectLoginSessions = memoize((args: { state: AuthSliceState }): Session[] => {
    const { state } = args;
    if (state.profile === undefined) {
        return [];
    }
    return state.profile.sessions;
});

// async thunks
export const fetchProfile = createAsyncThunk<User, { api: Api }>("fetchProfile", async ({ api }) => {
    return await api.fetchProfile();
});

export const login = createAsyncThunk<
    { profile: User; sessionToken: string; baseUrl: string },
    { username: string; password: string; sessionName: string; apiUrl?: string; api: Api }
>("login", async ({ username, password, sessionName, apiUrl, api }) => {
    // TODO: error handling
    if (apiUrl) {
        await api.init(apiUrl);
    }
    const loginResp = await api.login(username, password, sessionName);
    const profile = await api.fetchProfile();
    return { profile: profile, sessionToken: loginResp.sessionToken, baseUrl: loginResp.baseUrl };
});

export const logout = createAsyncThunk<void, { api: Api }>("logout", async ({ api }, { dispatch }) => {
    if (await api.hasConnection()) {
        try {
            await api.logout();
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
            const { profile, sessionToken, baseUrl } = action.payload;
            state.profile = profile;
            state.sessionToken = sessionToken;
            state.baseUrl = baseUrl;
        });
        builder.addCase(logout.fulfilled, (state, action) => {
            state.profile = undefined;
            state.sessionToken = undefined;
        });
    },
});

//export const {} = authSlice.actions;

export const { reducer: authReducer } = authSlice;
