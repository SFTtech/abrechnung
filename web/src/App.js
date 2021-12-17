import React, {Suspense, useMemo} from "react";
import {BrowserRouter as Router, Route, Switch} from "react-router-dom";
import {ToastContainer} from "react-toastify";
import DateAdapter from "@mui/lab/AdapterLuxon";
import {LocalizationProvider} from "@mui/lab";
import {useRecoilValue} from "recoil";

import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import Logout from "./pages/auth/Logout";
import Group from "./pages/groups/Group";
import Loading from "./components/style/Loading";
import PageNotFound from "./pages/PageNotFound";
import AuthenticatedRoute from "./components/AuthenticatedRoute";
import ChangeEmail from "./pages/profile/ChangeEmail";
import ChangePassword from "./pages/profile/ChangePassword";
import GroupList from "./pages/groups/GroupList";
import Layout from "./components/style/Layout";
import SessionList from "./pages/profile/SessionList";
import ConfirmPasswordRecovery from "./pages/auth/ConfirmPasswordRecovery";
import RequestPasswordRecovery from "./pages/auth/RequestPasswordRecovery";
import {createTheme, CssBaseline, ThemeProvider, useMediaQuery} from "@mui/material";
import {StyledEngineProvider} from "@mui/material/styles";
import Settings from "./pages/profile/Settings";
import {themeSettings} from "./recoil/settings";

const Profile = React.lazy(() => import("./pages/profile/Profile"));
const ConfirmEmailChange = React.lazy(() => import("./pages/auth/ConfirmEmailChange"));
const ConfirmRegistration = React.lazy(() => import("./pages/auth/ConfirmRegistration"));
const GroupInvite = React.lazy(() => import("./pages/groups/GroupInvite"));

const routes = [
    {
        path: "/",
        component: <GroupList/>,
        auth: true,
        exact: true
    },
    {
        path: "/invite/:inviteToken",
        component: <GroupInvite/>,
        auth: true
    },
    {
        path: "/groups/:id([0-9]+)",
        component: <Group/>,
        auth: true,
        layout: false
    },
    {
        path: "/profile",
        component: <Profile/>,
        auth: true,
        exact: true
    },
    {
        path: "/profile/settings",
        component: <Settings/>,
        auth: true,
        exact: true
    },
    {
        path: "/profile/change-email",
        component: <ChangeEmail/>,
        auth: true,
        exact: true
    },
    {
        path: "/profile/sessions",
        component: <SessionList/>,
        auth: true,
        exact: true
    },
    {
        path: "/profile/change-password",
        component: <ChangePassword/>,
        auth: true,
        exact: true
    },
    {
        path: "/logout",
        component: <Logout/>,
        auth: true,
        exact: true
    },
    {
        path: "/confirm-registration/:token",
        component: <ConfirmRegistration/>,
        auth: false
    },
    {
        path: "/recover-password",
        component: <RequestPasswordRecovery/>,
        auth: false
    },
    {
        path: "/confirm-password-recovery/:token",
        component: <ConfirmPasswordRecovery/>,
        auth: false
    },
    {
        path: "/confirm-email-change/:token",
        component: <ConfirmEmailChange/>,
        auth: false
    },
    {
        path: "/register",
        component: <Register/>,
        auth: false,
        layout: false
    },
    {
        path: "/login",
        component: <Login/>,
        auth: false,
        layout: false
    }
];

export default function App() {
    const darkModeSystem = useMediaQuery("(prefers-color-scheme: dark)");
    const userThemeSettings = useRecoilValue(themeSettings);

    const useDarkMode = userThemeSettings.darkMode === "browser"
        ? darkModeSystem ? "dark" : "light"
        : userThemeSettings.darkMode;


    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: useDarkMode,
                },
            }),
        [useDarkMode]
    );

    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <CssBaseline/>
                <LocalizationProvider dateAdapter={DateAdapter}>
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
                    >
                    </ToastContainer>
                    <Router>
                        <Switch>
                            {routes.map(route => {
                                const authRoute = route.auth ? (
                                    <AuthenticatedRoute>{route.component}</AuthenticatedRoute>
                                ) : route.component;

                                const layoutRoute = route.layout === undefined || route.layout ? (
                                    <Layout><Suspense fallback={<Loading/>}>{authRoute}</Suspense></Layout>
                                ) : (
                                    <Suspense fallback={<Loading/>}>{authRoute}</Suspense>
                                );

                                return (
                                    <Route key={route.path} exact={route.exact !== undefined && route.exact}
                                           path={route.path}>
                                        {layoutRoute}
                                    </Route>
                                );
                            })}
                            <Route exact path="/404"><PageNotFound/></Route>
                        </Switch>
                    </Router>
                </LocalizationProvider>
            </ThemeProvider>
        </StyledEngineProvider>
    );
}
