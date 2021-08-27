import React, {useEffect} from "react";
import {isAuthenticated, userData} from "../../recoil/auth";
import {useSetRecoilState} from "recoil";
import {logout} from "../../api";
import Loading from "../../components/style/Loading";


export default function Logout() {
    const setLoggedIn = useSetRecoilState(isAuthenticated);
    const setUserState = useSetRecoilState(userData);

    useEffect(() => {
        logout().then(res => {
            setLoggedIn(false);
            window.location.assign("/login");
        });
    }, [setLoggedIn, setUserState])

    return (
        <Loading/>
    )
}
