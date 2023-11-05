import { PaletteMode } from "@mui/material";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "browser" | PaletteMode;

export interface SettingsSliceState {
    theme: ThemeMode;
}

const initialState: SettingsSliceState = {
    theme: "browser",
};

// selectors
export const selectTheme = (args: { state: SettingsSliceState }): ThemeMode => {
    const { state } = args;
    return state.theme;
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
