import { Api, Session, User } from "@abrechnung/api";
import { createSlice } from "@reduxjs/toolkit";
import { PURGE } from "redux-persist";
import { AuthSliceState, IRootState } from "../types";
import { createAsyncThunkWithErrorHandling } from "../utils";

const initialState: AuthSliceState = {
    baseUrl: undefined,
    accessToken: undefined,
    profile: undefined,
    activeInstanceId: 0,
};

// selectors
export const selectAccessToken = (state: IRootState): string | undefined => {
    return state.auth.accessToken;
};

export const selectBaseUrl = (state: IRootState): string | undefined => {
    return state.auth.baseUrl;
};

export const selectIsAuthenticated = (state: IRootState): boolean => {
    return state.auth.accessToken !== undefined && state.auth.baseUrl !== undefined;
};

export const selectProfile = (state: IRootState): User | undefined => {
    return state.auth.profile;
};

export const selectCurrentUserId = (state: IRootState): number | undefined => {
    return state.auth.profile?.id;
};

export const selectIsGuestUser = (state: IRootState): boolean | undefined => {
    if (state.auth.profile === undefined) {
        return undefined;
    }
    return state.auth.profile.is_guest_user;
};

export const selectLoginSessions = (state: IRootState): Session[] => {
    if (state.auth.profile === undefined) {
        return [];
    }
    return state.auth.profile.sessions;
};

// async thunks
export const fetchProfile = createAsyncThunkWithErrorHandling<User, { api: Api }>("fetchProfile", async ({ api }) => {
    return await api.client.auth.getProfile();
});

export const login = createAsyncThunkWithErrorHandling<
    { profile: User; accessToken: string; baseUrl: string },
    { username: string; password: string; sessionName: string; api: Api }
>("login", async ({ username, password, sessionName, api }) => {
    const loginResp = await api.client.auth.login({ requestBody: { username, password, session_name: sessionName } });
    api.init(loginResp.access_token);
    const profile = await api.client.auth.getProfile();
    return { profile: profile, accessToken: loginResp.access_token, baseUrl: api.getBaseApiUrl() };
});

export const logout = createAsyncThunkWithErrorHandling<void, { api: Api }>("logout", async ({ api }, { dispatch }) => {
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
        builder.addCase(logout.fulfilled, (state) => {
            state.profile = undefined;
            state.accessToken = undefined;
        });
    },
});

//export const {} = authSlice.actions;

export const { reducer: authReducer } = authSlice;
