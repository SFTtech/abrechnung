import React from "react";
import { useRecoilValue } from "recoil";
import { isAuthenticated } from "../state/auth";
import { Redirect, useLocation } from "react-router-dom";

export default function AuthenticatedRoute({ authFallback = "/login", children }) {
    const loggedIn = useRecoilValue(isAuthenticated);
    const location = useLocation();

    return <>{!loggedIn ? <Redirect to={`${authFallback}?next=${location.pathname}`} /> : children}</>;
}
