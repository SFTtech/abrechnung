import { useEffect } from "react";
import { useLocation } from "react-router";

export const useQuery = (): URLSearchParams => {
    return new URLSearchParams(useLocation().search);
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
