import React from "react";
import { useRecoilValue } from "recoil";
import { isAuthenticated } from "../state/auth";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ authFallback = "/login", children }) {
    const loggedIn = useRecoilValue(isAuthenticated);
    const location = useLocation();
    if (!loggedIn) {
        return <Navigate to={`${authFallback}?next=${location.pathname}`} />;
    }

    return children;
}
