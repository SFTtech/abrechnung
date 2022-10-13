import * as React from "react";
import { useTheme } from "@mui/material/styles";

function pnlFormatter(value, currencySymbol) {
    return `${value.toFixed(2)} ${currencySymbol}`;
}

const CurrencyValue = React.memo(function Pnl({
    currencySymbol,
    value,
    forceColor,
}: {
    currencySymbol: string;
    value: number;
    forceColor: string;
}) {
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
            {pnlFormatter(value, currencySymbol)}
        </div>
    );
});

export function renderCurrency(currencySymbol, forceColor = undefined) {
    return (params) => {
        return <CurrencyValue currencySymbol={currencySymbol} value={params.value} forceColor={forceColor} />;
    };
}
