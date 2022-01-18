import * as React from "react";
import clsx from "clsx";
import { createTheme } from "@mui/material/styles";
import { createStyles, makeStyles } from "@mui/styles";

const defaultTheme = createTheme();
const useStyles = makeStyles(
    (theme) =>
        createStyles({
            root: {
                width: "100%",
                fontVariantNumeric: "tabular-nums",
                textAlign: "end",
            },
            positive: {
                color: theme.palette.mode === "light" ? theme.palette.success.dark : theme.palette.success.light,
            },
            negative: {
                color: theme.palette.mode === "light" ? theme.palette.error.dark : theme.palette.error.light,
            },
        }),
    { defaultTheme }
);

function pnlFormatter(value, currencySymbol) {
    return `${value} ${currencySymbol}`;
}

const CurrencyValue = React.memo(function Pnl(props) {
    const { currencySymbol, value, forceColor } = props;
    const classes = useStyles();

    const colorOverride =
        forceColor !== undefined ? (forceColor === "red" ? classes.negative : classes.positive) : null;

    return (
        <div
            className={clsx(
                classes.root,
                colorOverride
                    ? colorOverride
                    : {
                          [classes.positive]: value > 0,
                          [classes.negative]: value < 0,
                      }
            )}
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
