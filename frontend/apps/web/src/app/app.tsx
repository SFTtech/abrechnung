import { fetchGroups, selectAccessToken } from "@abrechnung/redux";
import { CssBaseline, PaletteMode, ThemeProvider, createTheme, useMediaQuery } from "@mui/material";
import { StyledEngineProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import * as React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Loading } from "@abrechnung/components";
import { api } from "../core/api";
import { selectTheme, useAppDispatch, useAppSelector } from "../store";
import { Router } from "./Router";

export const App = () => {
    const darkModeSystem = useMediaQuery("(prefers-color-scheme: dark)");
    const dispatch = useAppDispatch();
    const groupStoreStatus = useAppSelector((state) => state.groups.status);
    const [apiInitialized, setApiInitialized] = React.useState(false);
    const accessToken = useAppSelector(selectAccessToken);
    const themeMode = useAppSelector(selectTheme);
    const isAuthenticated = accessToken !== undefined;

    const useDarkMode: PaletteMode = themeMode === "browser" ? (darkModeSystem ? "dark" : "light") : themeMode;

    const theme = React.useMemo(
        () =>
            createTheme({
                palette: {
                    mode: useDarkMode,
                },
            }),
        [useDarkMode]
    );

    React.useEffect(() => {
        if (accessToken !== undefined) {
            // TODO: in case of backend version mismatch we have to catch the error here
            api.init(accessToken).then(() => {
                setApiInitialized(true);
                dispatch(fetchGroups({ api }));
            });
        } else {
            setApiInitialized(true);
        }
    }, [accessToken, dispatch]);

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
                    {(isAuthenticated && groupStoreStatus !== "initialized") || !apiInitialized ? (
                        <Loading />
                    ) : (
                        <Router />
                    )}
                </LocalizationProvider>
            </ThemeProvider>
        </StyledEngineProvider>
    );
};
