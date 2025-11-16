import { Theme } from "@mui/material";
import { useEffect } from "react";
import { useLocation } from "react-router";

export const useQuery = (): URLSearchParams => {
    return new URLSearchParams(useLocation().search);
};

export const balanceColor = (value: number, theme: Theme): string => {
    if (value >= 0) {
        return theme.palette.mode === "light" ? theme.palette.success.dark : theme.palette.success.light;
    } else {
        return theme.palette.mode === "light" ? theme.palette.error.dark : theme.palette.error.light;
    }
};

export const useTitle = (title: string) => {
    useEffect(() => {
        const prevTitle = document.title;
        document.title = title;
        return () => {
            document.title = prevTitle;
        };
    });
};
