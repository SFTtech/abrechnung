import { useFormatCurrency, useGetAmountColor } from "@/hooks";
import * as React from "react";

interface CurrencyValueProps {
    currencySymbol: string;
    value?: number;
}

const CurrencyValue = React.memo(({ currencySymbol, value = 0 }: CurrencyValueProps) => {
    const formatCurrency = useFormatCurrency();
    const getAmountColor = useGetAmountColor();

    return (
        <div
            style={{
                color: getAmountColor(value),
                width: "100%",
                fontVariantNumeric: "tabular-nums",
                textAlign: "end",
            }}
        >
            {formatCurrency(value, currencySymbol)}
        </div>
    );
});
CurrencyValue.displayName = "CurrencyValue";

export function renderCurrency(currencySymbol: string) {
    const component = (params: { value?: number }) => {
        return <CurrencyValue currencySymbol={currencySymbol} value={params.value} />;
    };
    component.displayName = "CurrencyValue";
    return component;
}
