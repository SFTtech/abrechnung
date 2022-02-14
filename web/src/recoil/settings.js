import { atom } from "recoil";
import { localStorageEffect } from "./cache";

export const themeSettings = atom({
    key: "themeSettings",
    default: { darkMode: "browser" }, // one of "dark", "light", "browser"
    effects_UNSTABLE: [localStorageEffect("settings.theme")],
});

export const transactionSettings = atom({
    key: "transactionSettings",
    default: {}, // one of "dark", "light", "browser"
    effects_UNSTABLE: [localStorageEffect("settings.transactions")],
});
