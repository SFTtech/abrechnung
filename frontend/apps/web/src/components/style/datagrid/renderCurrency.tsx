import { useFormatCurrency, useGetAmountColor } from "@/hooks";
import * as React from "react";

interface CurrencyValueProps {
    currencySymbol: string;
    value?: number;
    signOverride?: number;
}

const CurrencyValue = React.memo(({ currencySymbol, value = 0, signOverride }: CurrencyValueProps) => {
    const formatCurrency = useFormatCurrency();
    const getAmountColor = useGetAmountColor();

    return (
        <div
            style={{
                color: getAmountColor(signOverride ?? value),
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

export function renderCurrency(
    currencySymbol: string,
    signOverride?: number
): (params: { value?: number }) => React.ReactNode {
    const component: React.FC<{ value?: number }> = (params) => {
        return <CurrencyValue currencySymbol={currencySymbol} value={params.value} signOverride={signOverride} />;
    };
    component.displayName = "CurrencyValue";
    return component;
}
