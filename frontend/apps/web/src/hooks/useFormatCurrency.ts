import * as React from "react";

export const useFormatCurrency = () => {
    return React.useCallback((value: number, currencySymbol: string) => {
        return `${value.toFixed(2)} ${currencySymbol}`;
    }, []);
};
