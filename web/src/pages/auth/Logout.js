import React, { useEffect } from "react";
import {isAuthenticated, logout, userData} from "../../recoil/auth";
import {useSetRecoilState} from "recoil";
import {Redirect} from "react-router-dom";


export default function Logout() {
    const setLoggedIn = useSetRecoilState(isAuthenticated);
    const setUserState = useSetRecoilState(userData);

    useEffect(() => {
        logout();
        setLoggedIn(false);

        window.location.assign("/");
    }, [setLoggedIn, setUserState])

    return (
        <Redirect to="/login" />
    )
}
