import React, { useEffect } from "react";
import {isAuthenticated, logout, userData} from "../../recoil/auth";
import {useSetRecoilState} from "recoil";
import {toast} from "react-toastify";
import {Redirect} from "react-router-dom";


export default function Logout() {
    const setLoggedIn = useSetRecoilState(isAuthenticated);
    const setUserState = useSetRecoilState(userData);

    useEffect(() => {
        logout();
        setLoggedIn(false);
        setUserState({});

        toast.error(`🐱 Logged out...`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            });
    }, [setLoggedIn, setUserState])

    return (
        <Redirect to="/login" />
    )
}
