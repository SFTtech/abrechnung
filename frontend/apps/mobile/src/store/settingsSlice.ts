import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

export type ThemeMode = "light" | "dark" | "system";

export interface SettingsSliceState {
    theme: ThemeMode;
}

const initialState: SettingsSliceState = {
    theme: "system",
};

// selectors
export const selectTheme = (state: RootState): ThemeMode => {
    return state.settings.theme;
};

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
