import { selectIsAuthenticated } from "@abrechnung/redux";
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { selectAuthSlice, useAppSelector } from "@/store";

interface Props {
    authFallback?: string;
    children: React.ReactElement; // TODO: figure out if this is correct
}

export const RequireAuth: React.FC<Props> = ({ authFallback = "/login", children }) => {
    const loggedIn = useAppSelector((state) => selectIsAuthenticated({ state: selectAuthSlice(state) }));
    const location = useLocation();
    if (!loggedIn) {
        return <Navigate to={`${authFallback}?next=${location.pathname}`} />;
    }

    return children;
};
