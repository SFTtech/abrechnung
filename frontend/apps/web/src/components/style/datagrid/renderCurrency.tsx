import { useTheme } from "@mui/material/styles";
import * as React from "react";

function pnlFormatter(value: number, currency_symbol: string) {
    return `${value.toFixed(2)} ${currency_symbol}`;
}

interface CurrencyValueProps {
    currency_symbol: string;
    value?: number;
    forceColor?: string;
}

const CurrencyValue = React.memo(({ currency_symbol, value = 0, forceColor }: CurrencyValueProps) => {
    const theme = useTheme();

    const positiveColor = theme.palette.mode === "light" ? theme.palette.success.dark : theme.palette.success.light;
    const negativeColor = theme.palette.mode === "light" ? theme.palette.error.dark : theme.palette.error.light;

    const colorOverride = forceColor !== undefined ? (forceColor === "red" ? negativeColor : positiveColor) : null;

    return (
        <div
            style={{
                color: colorOverride ? colorOverride : value >= 0 ? positiveColor : negativeColor,
                width: "100%",
                fontVariantNumeric: "tabular-nums",
                textAlign: "end",
            }}
        >
            {pnlFormatter(value, currency_symbol)}
        </div>
    );
});
CurrencyValue.displayName = "CurrencyValue";

export function renderCurrency(
    currency_symbol: string,
    forceColor?: string
): (params: { value?: number }) => React.ReactNode {
    const component: React.FC<{ value?: number }> = (params) => {
        return <CurrencyValue currency_symbol={currency_symbol} value={params.value} forceColor={forceColor} />;
    };
    component.displayName = "CurrencyValue";
    return component;
}
