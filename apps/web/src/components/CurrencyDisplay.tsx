import { useFormatCurrency } from "@/hooks";
import { Theme, useTheme } from "@mui/material";
import * as React from "react";

export type CurrencyDisplayProps = {
    amount: number;
    currencyIdentifier?: string;
    useColor?: boolean;
};

const balanceColor = (value: number, theme: Theme): string => {
    if (value >= 0) {
        return theme.palette.mode === "light" ? theme.palette.success.dark : theme.palette.success.light;
    } else {
        return theme.palette.mode === "light" ? theme.palette.error.dark : theme.palette.error.light;
    }
};

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ amount, currencyIdentifier, useColor = false }) => {
    const formatCurrency = useFormatCurrency();
    const theme = useTheme();
    const color = useColor ? balanceColor(amount, theme) : undefined;

    return <span style={{ textWrap: "nowrap", color }}>{formatCurrency(amount, currencyIdentifier)}</span>;
};
