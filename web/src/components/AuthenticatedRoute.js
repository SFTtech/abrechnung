import {useRecoilValue} from "recoil";
import {isAuthenticated} from "../recoil/auth";
import {Redirect, useLocation} from "react-router-dom";
import React from "react";

export default function AuthenticatedRoute({authFallback = "/login", children}) {
    const loggedIn = useRecoilValue(isAuthenticated);
    const location = useLocation();

    return (
        <>
            {!loggedIn ? <Redirect to={`${authFallback}?next=${location.pathname}`}/> : children}
        </>
    )
}