import { atom } from "recoil";
import { localStorageEffect } from "./cache";
import { PaletteMode } from "@mui/material";

export interface ThemeSettings {
    darkMode: PaletteMode | "browser";
}

const initialThemeSettings: ThemeSettings = {
    darkMode: "browser",
};

export const themeSettings = atom({
    key: "themeSettings",
    default: initialThemeSettings,
    effects_UNSTABLE: [localStorageEffect("settings.theme")],
});

export interface TransactionSettings {}

const initialTransactionSettings: TransactionSettings = {};

export const transactionSettings = atom({
    key: "transactionSettings",
    default: initialTransactionSettings,
    effects_UNSTABLE: [localStorageEffect("settings.transactions")],
});
