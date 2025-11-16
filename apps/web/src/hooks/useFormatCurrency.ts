import * as React from "react";
import { useTranslation } from "react-i18next";

export const useFormatCurrency = () => {
    const { i18n } = useTranslation();

    return React.useCallback(
        (value: number, currencyIdentifier?: string, maximumFractionDigits?: number) => {
            if (!currencyIdentifier) {
                const formatDef = new Intl.NumberFormat(i18n.language, {
                    style: "decimal",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: maximumFractionDigits ?? 2,
                });

                return formatDef.format(value);
            }

            const formatDef = new Intl.NumberFormat(i18n.language, {
                currency: currencyIdentifier,
                style: "currency",
                minimumFractionDigits: 2,
                maximumFractionDigits: maximumFractionDigits ?? 2,
            });

            return formatDef.format(value);
        },
        [i18n]
    );
};
