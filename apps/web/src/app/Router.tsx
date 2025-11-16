import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { ConfirmEmailChange } from "../pages/auth/ConfirmEmailChange";
import { ConfirmPasswordRecovery } from "../pages/auth/ConfirmPasswordRecovery";
import { ConfirmRegistration } from "../pages/auth/ConfirmRegistration";
import { Login } from "../pages/auth/Login";
import { Logout } from "../pages/auth/Logout";
import { Register } from "../pages/auth/Register";
import { RequestPasswordRecovery } from "../pages/auth/RequestPasswordRecovery";
import { Group } from "../pages/groups/Group";
import { GroupInvite } from "../pages/groups/GroupInvite";
import { GroupList } from "../pages/groups/GroupList";
import { PageNotFound } from "../pages/PageNotFound";
import { ChangeEmail } from "../pages/profile/ChangeEmail";
import { ChangePassword } from "../pages/profile/ChangePassword";
import { Profile } from "../pages/profile/Profile";
import { SessionList } from "../pages/profile/SessionList";
import { Settings } from "../pages/profile/Settings";
import { AuthenticatedLayout } from "./authenticated-layout/AuthenticatedLayout";
import { UnauthenticatedLayout } from "./unauthenticated-layout/UnauthenticatedLayout";

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
        path: "404",
        element: <PageNotFound />,
    },
    {
        path: "*",
        element: <PageNotFound />,
    },
]);

export const Router: React.FC = () => {
    return <RouterProvider router={router} />;
};
