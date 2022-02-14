import { useLocation } from "react-router-dom";
import { useEffect } from "react";

export function useQuery() {
    return new URLSearchParams(useLocation().search);
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
