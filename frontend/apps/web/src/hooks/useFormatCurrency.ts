import * as React from "react";
const formatDef = new Intl.NumberFormat("de", {
    currency: "EUR",
    style: "currency",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export const useFormatCurrency = () => {
    return React.useCallback((value: number, currencySymbol: string) => {
        return formatDef.format(value).replace("€", currencySymbol);
    }, []);
};
