import React from "react";
import { Link } from "react-router-dom";
import { isAuthenticated } from "../../recoil/auth";
import { useRecoilValue } from "recoil";

export default function Header() {
    const authenticated = useRecoilValue(isAuthenticated);

    return <></>;
}
