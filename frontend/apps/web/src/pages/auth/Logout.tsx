import React, { useEffect } from "react";
import { Loading } from "@abrechnung/components";
import { useAppDispatch, useAppSelector } from "@/store";
import { logout, selectIsAuthenticated } from "@abrechnung/redux";
import { api } from "@/core/api";
import { Navigate } from "react-router-dom";

export const Logout: React.FC = () => {
    const dispatch = useAppDispatch();
    const isAuthenticated = useAppSelector(selectIsAuthenticated);

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(logout({ api }));
        }
    }, [isAuthenticated, dispatch]);

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return <Loading />;
};
