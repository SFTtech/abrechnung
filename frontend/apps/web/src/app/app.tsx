import {
    AbrechnungUpdateProvider,
    fetchGroups,
    selectAccessToken,
    selectCurrentUserId,
    subscribe,
    unsubscribe,
} from "@abrechnung/redux";
import { CssBaseline, PaletteMode, ThemeProvider, createTheme, useMediaQuery } from "@mui/material";
import { StyledEngineProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { useEffect, useMemo } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "../components/style/Loading";
import { api, ws } from "../core/api";
import { selectAuthSlice, selectSettingsSlice, selectTheme, useAppDispatch, useAppSelector } from "../store";
import { Router } from "./Router";

export default function App() {
    const darkModeSystem = useMediaQuery("(prefers-color-scheme: dark)");
    const dispatch = useAppDispatch();
    const groupStoreStatus = useAppSelector((state) => state.groups.status);
    const accessToken = useAppSelector((state) => selectAccessToken({ state: selectAuthSlice(state) }));
    const themeMode = useAppSelector((state) => selectTheme({ state: selectSettingsSlice(state) }));
    const isAuthenticated = accessToken !== undefined;
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
        if (accessToken !== undefined) {
            api.init(accessToken).then(() => {
                console.log("dispatching fetch groups");
                dispatch(fetchGroups({ api }));
            });
        }
    }, [accessToken, dispatch]);

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
