import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Theme } from "@mui/material";

export function useQuery() {
    return new URLSearchParams(useLocation().search);
}

export function balanceColor(value: number, theme: Theme) {
    if (value >= 0) {
        return theme.palette.mode === "light" ? theme.palette.success.dark : theme.palette.success.light;
    } else {
        return theme.palette.mode === "light" ? theme.palette.error.dark : theme.palette.error.light;
    }
}

export function useTitle(title: string) {
    useEffect(() => {
        const prevTitle = document.title;
        document.title = title;
        return () => {
            document.title = prevTitle;
        };
    });
}
