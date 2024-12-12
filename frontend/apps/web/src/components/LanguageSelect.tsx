import { MenuItem, Select, SelectChangeEvent, SelectProps } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

export type LanguageSelectProps = Omit<SelectProps, "value" | "onChange" | "variant">;

export const LanguageSelect: React.FC<LanguageSelectProps> = (props) => {
    const { t, i18n } = useTranslation();

    const handleSetLanguage = (event: SelectChangeEvent<unknown>) => {
        const lang = event.target.value as string;
        i18n.changeLanguage(lang);
    };

    return (
        <Select
            value={i18n.language}
            sx={{ color: "inherit" }}
            variant="outlined"
            onChange={handleSetLanguage}
            {...props}
        >
            <MenuItem value="en-US">{t("languages.en")}</MenuItem>
            <MenuItem value="de-DE">{t("languages.de")}</MenuItem>
            <MenuItem value="es-ES">{t("languages.es")}</MenuItem>
            <MenuItem value="ta-LK">{t("languages.ta")}</MenuItem>
        </Select>
    );
};
