import React, { ReactNode, Suspense, useEffect, useMemo } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";

import Register from "../pages/auth/Register";
import Login from "../pages/auth/Login";
import Logout from "../pages/auth/Logout";
import Group from "../pages/groups/Group";
import Loading from "../components/style/Loading";
import PageNotFound from "../pages/PageNotFound";
import RequireAuth from "../components/RequireAuth";
import ChangeEmail from "../pages/profile/ChangeEmail";
import ChangePassword from "../pages/profile/ChangePassword";
import GroupList from "../pages/groups/GroupList";
import Layout from "../components/style/Layout";
import SessionList from "../pages/profile/SessionList";
import ConfirmPasswordRecovery from "../pages/auth/ConfirmPasswordRecovery";
import RequestPasswordRecovery from "../pages/auth/RequestPasswordRecovery";
import { createTheme, CssBaseline, PaletteMode, ThemeProvider, useMediaQuery } from "@mui/material";
import { StyledEngineProvider } from "@mui/material/styles";
import Settings from "../pages/profile/Settings";
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

const Profile = React.lazy(() => import("../pages/profile/Profile"));
const ConfirmEmailChange = React.lazy(() => import("../pages/auth/ConfirmEmailChange"));
const ConfirmRegistration = React.lazy(() => import("../pages/auth/ConfirmRegistration"));
const GroupInvite = React.lazy(() => import("../pages/groups/GroupInvite"));

const makeRouteElement = (element: ReactNode, requireAuth = false, useLayout = true): ReactNode => {
    const layoutComponent = useLayout ? (
        <Layout>
            <Suspense fallback={<Loading />}>{element}</Suspense>
        </Layout>
    ) : (
        <Suspense fallback={<Loading />}>{element}</Suspense>
    );

    return requireAuth ? <RequireAuth>{layoutComponent}</RequireAuth> : layoutComponent;
};

const router = createBrowserRouter([
    {
        path: "/",
        element: makeRouteElement(<GroupList />, true),
    },
    {
        path: "invite/:inviteToken",
        element: makeRouteElement(<GroupInvite />, true),
    },
    {
        path: "groups/:id/*",
        element: makeRouteElement(<Group />, true, false),
    },
    {
        path: "profile",
        element: makeRouteElement(<Profile />, true),
    },
    {
        path: "profile/settings",
        element: makeRouteElement(<Settings />, true),
    },
    {
        path: "profile/change-email",
        element: makeRouteElement(<ChangeEmail />, true),
    },
    {
        path: "profile/sessions",
        element: makeRouteElement(<SessionList />, true),
    },
    {
        path: "profile/change-password",
        element: makeRouteElement(<ChangePassword />, true),
    },
    {
        path: "logout",
        element: makeRouteElement(<Logout />, false),
    },
    {
        path: "confirm-registration/:token",
        element: makeRouteElement(<ConfirmRegistration />, false),
    },
    {
        path: "recover-password",
        element: makeRouteElement(<RequestPasswordRecovery />, false),
    },
    {
        path: "confirm-password-recovery/:token",
        element: makeRouteElement(<ConfirmPasswordRecovery />, false),
    },
    {
        path: "confirm-email-change/:token",
        element: makeRouteElement(<ConfirmEmailChange />, false),
    },
    {
        path: "register",
        element: makeRouteElement(<Register />, false),
    },
    {
        path: "login",
        element: makeRouteElement(<Login />, false),
    },
    {
        path: "404",
        element: makeRouteElement(<PageNotFound />, false),
    },
]);

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
                            <RouterProvider router={router} />
                        </AbrechnungUpdateProvider>
                    )}
                </LocalizationProvider>
            </ThemeProvider>
        </StyledEngineProvider>
    );
}
