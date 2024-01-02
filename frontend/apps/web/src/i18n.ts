import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { resources, defaultNS } from "@abrechnung/translations";

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        ns: [defaultNS],
        resources,
        defaultNS,
        lng: "en-US",
        fallbackLng: "en",
        debug: true,
        interpolation: { escapeValue: false },
    });

export default i18n;
