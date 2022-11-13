import { RootState } from "./store";

export const selectGroupSlice = (state: RootState) => state.groups;
export const selectAccountSlice = (state: RootState) => state.accounts;
export const selectTransactionSlice = (state: RootState) => state.transactions;
export const selectAuthSlice = (state: RootState) => state.auth;
export const selectSettingsSlice = (state: RootState) => state.settings;
export const selectUiSlice = (state: RootState) => state.ui;
