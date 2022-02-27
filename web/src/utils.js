import { useLocation } from "react-router-dom";
import { useEffect } from "react";

export function useQuery() {
    return new URLSearchParams(useLocation().search);
}

export function balanceColor(value, theme) {
    if (value >= 0) {
        return theme.palette.mode === "light" ? theme.palette.success.dark : theme.palette.success.light;
    } else {
        return theme.palette.mode === "light" ? theme.palette.error.dark : theme.palette.error.light;
    }
}

export function useTitle(title) {
    useEffect(() => {
        const prevTitle = document.title;
        document.title = title;
        return () => {
            document.title = prevTitle;
        };
    });
}
