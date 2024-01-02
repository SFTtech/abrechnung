import type { en } from "./en";

const translations = {
    languages: {
        en: "Englisch",
        de: "Deutsch",
    },
} satisfies Partial<(typeof en)["translations"]>;

export const de = {
    translations,
};
