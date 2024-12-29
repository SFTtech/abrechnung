import * as React from "react";
import { useTranslation } from "react-i18next";

export const useFormatCurrency = () => {
    const { i18n } = useTranslation();

    return React.useCallback(
        (value: number, currencySymbol: string) => {
            const formatDef = new Intl.NumberFormat(i18n.language, {
                currency: "EUR",
                style: "currency",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });

            return formatDef.format(value).replace("€", currencySymbol);
        },
        [i18n]
    );
};
