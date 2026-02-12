import * as React from "react";
import { useTheme } from "@mui/material";

export const useGetAmountColor = () => {
    const theme = useTheme();

    return React.useCallback(
        (amount: number) => {
            const colorGreenInverted =
                theme.palette.mode === "dark" ? theme.palette.success.light : theme.palette.success.dark;
            const colorRedInverted =
                theme.palette.mode === "dark" ? theme.palette.error.light : theme.palette.error.dark;

            if (Math.abs(amount) < Number.EPSILON) {
                return undefined;
            }

            return amount < 0 ? colorRedInverted : colorGreenInverted;
        },
        [theme]
    );
};
