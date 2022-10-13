import React from "react";
import { useRecoilValue } from "recoil";
import { isAuthenticated } from "../state/auth";
import { Navigate, useLocation } from "react-router-dom";

interface Props {
    authFallback?: string;
    children: React.ReactElement; // TODO: figure out if this is correct
}

export const RequireAuth: React.FC<Props> = ({ authFallback = "/login", children }) => {
    const loggedIn = useRecoilValue(isAuthenticated);
    const location = useLocation();
    if (!loggedIn) {
        return <Navigate to={`${authFallback}?next=${location.pathname}`} />;
    }

    return children;
};

export default RequireAuth;
