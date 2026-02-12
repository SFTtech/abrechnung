import { selectLanguage, updateLanguage, useAppDispatch, useAppSelector } from "@/store";
import { MenuItem, Select, SelectChangeEvent, SelectProps } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

export type LanguageSelectProps = Omit<SelectProps, "value" | "onChange" | "variant">;

export const LanguageSelect: React.FC<LanguageSelectProps> = (props) => {
    const { t, i18n } = useTranslation();
    const language = useAppSelector(selectLanguage);
    const dispatch = useAppDispatch();

    React.useEffect(() => {
        if (i18n.language != language && language != null) {
            i18n.changeLanguage(language);
        }
    }, [language, i18n]);

    const handleSetLanguage = (event: SelectChangeEvent<unknown>) => {
        const lang = event.target.value as string;
        i18n.changeLanguage(lang);
        dispatch(updateLanguage(lang));
    };

    return (
        <Select
            value={i18n.language}
            sx={{ color: "inherit", border: "none" }}
            variant="outlined"
            onChange={handleSetLanguage}
            {...props}
        >
            <MenuItem value="en-US">{t("languages.en")}</MenuItem>
            <MenuItem value="de-DE">{t("languages.de")}</MenuItem>
            <MenuItem value="es-ES">{t("languages.es")}</MenuItem>
            <MenuItem value="ta-LK">{t("languages.ta")}</MenuItem>
            <MenuItem value="uk-UA">{t("languages.uk")}</MenuItem>
            <MenuItem value="ru-RU">{t("languages.ru")}</MenuItem>
            <MenuItem value="bg-BG">{t("languages.bg")}</MenuItem>
            <MenuItem value="fr-FR">{t("languages.fr")}</MenuItem>
        </Select>
    );
};
