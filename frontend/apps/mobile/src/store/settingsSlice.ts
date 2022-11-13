import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import memoize from "proxy-memoize";

export type ThemeMode = "light" | "dark" | "system";

export interface SettingsSliceState {
    theme: ThemeMode;
}

const initialState: SettingsSliceState = {
    theme: "system",
};

// selectors
export const selectTheme = memoize((args: { state: SettingsSliceState }): ThemeMode => {
    const { state } = args;
    return state.theme;
});

const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        themeChanged: (state, action: PayloadAction<ThemeMode>) => {
            state.theme = action.payload;
        },
    },
});

export const { themeChanged } = settingsSlice.actions;

export const { reducer: settingsReducer } = settingsSlice;
