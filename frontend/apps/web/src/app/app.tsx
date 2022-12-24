import React, { useEffect, useMemo } from "react";
import { ToastContainer } from "react-toastify";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";

import Loading from "../components/style/Loading";
import { createTheme, CssBaseline, PaletteMode, ThemeProvider, useMediaQuery } from "@mui/material";
import { StyledEngineProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";

import "react-toastify/dist/ReactToastify.css";
import { api, baseURL, ws } from "../core/api";
import { useAppDispatch, useAppSelector, selectAuthSlice, selectTheme, selectSettingsSlice } from "../store";
import {
    AbrechnungUpdateProvider,
    fetchGroups,
    selectSessionToken,
    subscribe,
    unsubscribe,
    selectCurrentUserId,
} from "@abrechnung/redux";
import { Router } from "./Router";

export default function App() {
    const darkModeSystem = useMediaQuery("(prefers-color-scheme: dark)");
    const dispatch = useAppDispatch();
    const groupStoreStatus = useAppSelector((state) => state.groups.status);
    const sessionToken = useAppSelector((state) => selectSessionToken({ state: selectAuthSlice(state) }));
    const themeMode = useAppSelector((state) => selectTheme({ state: selectSettingsSlice(state) }));
    const isAuthenticated = sessionToken !== undefined;
    const userId = useAppSelector((state) => selectCurrentUserId({ state: selectAuthSlice(state) }));

    const useDarkMode: PaletteMode = themeMode === "browser" ? (darkModeSystem ? "dark" : "light") : themeMode;

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: useDarkMode,
                },
            }),
        [useDarkMode]
    );

    useEffect(() => {
        if (sessionToken !== undefined) {
            api.init(baseURL, sessionToken).then(() => {
                console.log("dispatching fetch groups");
                dispatch(fetchGroups({ api }));
            });
        }
    }, [sessionToken, dispatch]);

    useEffect(() => {
        if (!isAuthenticated || userId === undefined) {
            return () => {
                return;
            };
        }

        dispatch(subscribe({ subscription: { type: "group", userId }, websocket: ws }));

        return () => {
            dispatch(unsubscribe({ subscription: { type: "group", userId }, websocket: ws }));
        };
    }, [dispatch, isAuthenticated, userId]);

    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <LocalizationProvider dateAdapter={AdapterLuxon}>
                    <ToastContainer
                        position="top-right"
                        autoClose={5000}
                        hideProgressBar={false}
                        newestOnTop={false}
                        closeOnClick
                        rtl={false}
                        pauseOnFocusLoss
                        draggable
                        pauseOnHover
                    />
                    {isAuthenticated && groupStoreStatus !== "initialized" ? (
                        <Loading />
                    ) : (
                        <AbrechnungUpdateProvider api={api} websocket={ws}>
                            <Router />
                        </AbrechnungUpdateProvider>
                    )}
                </LocalizationProvider>
            </ThemeProvider>
        </StyledEngineProvider>
    );
}
