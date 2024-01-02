import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources, defaultNS } from "@abrechnung/translations";

i18n.use(initReactI18next).init({
    ns: [defaultNS],
    resources,
    defaultNS,
    lng: "en",
    fallbackLng: "en",
    debug: true,
    interpolation: { escapeValue: false },
});

export default i18n;
