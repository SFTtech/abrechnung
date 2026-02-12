import { PaletteMode } from "@mui/material";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import { AccountSortMode, TransactionSortMode } from "@abrechnung/core";

export type ThemeMode = "browser" | PaletteMode;

export interface SettingsSliceState {
    theme: ThemeMode;
    transactionSortMode: TransactionSortMode;
    personalAccountSortMode: AccountSortMode;
    clearingAccountSortMode: AccountSortMode;
    language: string | null;
}

const initialState: SettingsSliceState = {
    theme: "browser",
    transactionSortMode: "last_changed",
    personalAccountSortMode: "name",
    clearingAccountSortMode: "last_changed",
    language: null,
};

// selectors
export const selectTheme = (state: RootState): ThemeMode => {
    return state.settings.theme;
};

export const selectPersonalAccountSortMode = (state: RootState) => {
    return state.settings.personalAccountSortMode;
};

export const selectClearingAccountSortMode = (state: RootState) => {
    return state.settings.clearingAccountSortMode;
};

export const selectTransactionSortMode = (state: RootState) => {
    return state.settings.transactionSortMode;
};

export const selectLanguage = (state: RootState) => {
    return state.settings.language;
};

const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        themeChanged: (state, action: PayloadAction<ThemeMode>) => {
            state.theme = action.payload;
        },
        updatePersonalAccountSortMode: (state, action: PayloadAction<AccountSortMode>) => {
            state.personalAccountSortMode = action.payload;
        },
        updateClearingAccountSortMode: (state, action: PayloadAction<AccountSortMode>) => {
            state.clearingAccountSortMode = action.payload;
        },
        updateTransactionSortMode: (state, action: PayloadAction<TransactionSortMode>) => {
            state.transactionSortMode = action.payload;
        },
        updateLanguage: (state, action: PayloadAction<string>) => {
            state.language = action.payload;
        },
    },
});

export const {
    themeChanged,
    updateClearingAccountSortMode,
    updatePersonalAccountSortMode,
    updateTransactionSortMode,
    updateLanguage,
} = settingsSlice.actions;

export const { reducer: settingsReducer } = settingsSlice;
