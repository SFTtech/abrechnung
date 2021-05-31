import {useRecoilValue} from "recoil";
import {isAuthenticated} from "../recoil/auth";
import {Redirect} from "react-router-dom";
import React from "react";

export default function AuthenticatedRoute({authFallback = "/login", children}) {
    const loggedIn = useRecoilValue(isAuthenticated);

    return (
        <>
            {!loggedIn ? <Redirect to={authFallback}/> : children}
        </>
    )
}