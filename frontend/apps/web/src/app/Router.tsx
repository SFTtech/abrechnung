import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Register from "../pages/auth/Register";
import Login from "../pages/auth/Login";
import Logout from "../pages/auth/Logout";
import Group from "../pages/groups/Group";
import PageNotFound from "../pages/PageNotFound";
import ChangeEmail from "../pages/profile/ChangeEmail";
import ChangePassword from "../pages/profile/ChangePassword";
import GroupList from "../pages/groups/GroupList";
import SessionList from "../pages/profile/SessionList";
import ConfirmPasswordRecovery from "../pages/auth/ConfirmPasswordRecovery";
import RequestPasswordRecovery from "../pages/auth/RequestPasswordRecovery";
import Settings from "../pages/profile/Settings";
import { AuthenticatedLayout } from "./authenticated-layout/AuthenticatedLayout";
import { UnauthenticatedLayout } from "./unauthenticated-layout/UnauthenticatedLayout";

const Profile = React.lazy(() => import("../pages/profile/Profile"));
const ConfirmEmailChange = React.lazy(() => import("../pages/auth/ConfirmEmailChange"));
const ConfirmRegistration = React.lazy(() => import("../pages/auth/ConfirmRegistration"));
const GroupInvite = React.lazy(() => import("../pages/groups/GroupInvite"));

const router = createBrowserRouter([
    {
        path: "/",
        element: <AuthenticatedLayout />,
        children: [
            {
                index: true,
                element: <GroupList />,
            },
            {
                path: "invite/:inviteToken",
                element: <GroupInvite />,
            },
            {
                path: "groups/:groupId/*",
                element: <Group />,
            },
            {
                path: "profile",
                element: <Profile />,
            },
            {
                path: "profile/settings",
                element: <Settings />,
            },
            {
                path: "profile/change-email",
                element: <ChangeEmail />,
            },
            {
                path: "profile/sessions",
                element: <SessionList />,
            },
            {
                path: "profile/change-password",
                element: <ChangePassword />,
            },
            {
                path: "logout",
                element: <Logout />,
            },
        ],
    },
    {
        element: <UnauthenticatedLayout />,
        children: [
            {
                path: "/confirm-password-recovery/:token",
                element: <ConfirmPasswordRecovery />,
            },
            {
                path: "/confirm-email-change/:token",
                element: <ConfirmEmailChange />,
            },
            {
                path: "/register",
                element: <Register />,
            },
            {
                path: "/login",
                element: <Login />,
            },
            {
                path: "/confirm-registration/:token",
                element: <ConfirmRegistration />,
            },
            {
                path: "/recover-password",
                element: <RequestPasswordRecovery />,
            },
        ],
    },
    {
        path: "*",
        element: <PageNotFound />,
    },
]);

export const Router: React.FC = () => {
    return <RouterProvider router={router} />;
};
