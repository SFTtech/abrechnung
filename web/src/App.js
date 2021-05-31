import React, {Suspense, useState} from "react";
import {BrowserRouter as Router, Route, Switch} from "react-router-dom";
import {toast, ToastContainer} from "react-toastify";

import "bootswatch/dist/flatly/bootstrap.min.css";
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import Logout from "./pages/auth/Logout";
import Group from "./pages/Group";
import "./App.css";
import Home from "./pages/Home";
import Loading from "./components/Loading";
import PageNotFound from "./pages/PageNotFound";
import {fetchToken, fetchUserData, isAuthenticated, sessionToken, userData} from "./recoil/auth";
import {useSetRecoilState} from "recoil";
import AuthenticatedRoute from "./components/AuthenticatedRoute";

const Profile = React.lazy(() => import("./pages/auth/Profile"));
const Groups = React.lazy(() => import("./pages/GroupList"));
const ConfirmEmailChange = React.lazy(() => import("./components/auth/ConfirmEmailChange"));
const ConfirmRegistration = React.lazy(() => import("./pages/auth/ConfirmRegistration"));

const GroupInvite = React.lazy(() => import("./pages/GroupInvite"));

export default function App() {
    const setStoreToken = useSetRecoilState(sessionToken)
    const setLoggedIn = useSetRecoilState(isAuthenticated);
    const setUserData = useSetRecoilState(userData);
    const authToken = fetchToken();
    const [loading, setLoading] = useState(authToken !== null);

    if (loading) {
        console.log(authToken, loading)
        fetchUserData({authToken: authToken})
            .then(result => {
                setUserData(result);
                setStoreToken(authToken);
                setLoggedIn(true);
                setLoading(false);
                // toast.success(`loaded user`, {
                //     position: "top-right",
                //     autoClose: 5000,
                // });
            })
            .catch(err => {
                toast.error(`${err}`, {
                    position: "top-right",
                    autoClose: 5000,
                });
                localStorage.removeItem("sessionToken");
                setStoreToken(null);
                setLoggedIn(false);
                setLoading(false);
            })
    }

    return (
        <>
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
            {loading ? <Loading/> : (
                <Router>
                    <Switch>
                        <Route exact path="/">
                            <Suspense fallback={<Loading/>}>
                                <AuthenticatedRoute>
                                    <Home/>
                                </AuthenticatedRoute>
                            </Suspense>
                        </Route>
                        <Route exact path="/register" component={Register}/>
                        <Route exact path="/login" component={Login}/>
                        <Route path="/confirm-registration/:token">
                            <Suspense fallback={<Loading/>}>
                                <ConfirmRegistration/>
                            </Suspense>
                        </Route>
                        <Route path="/confirm-email-change/:token">
                            <Suspense fallback={<Loading/>}>
                                <ConfirmEmailChange/>
                            </Suspense>
                        </Route>
                        <Route exact path="/logout">
                            <AuthenticatedRoute>
                                <Logout/>
                            </AuthenticatedRoute>
                        </Route>
                        <Route exact path="/groups">
                            <Suspense fallback={<Loading/>}>
                                <AuthenticatedRoute>
                                    <Groups/>
                                </AuthenticatedRoute>
                            </Suspense>
                        </Route>
                        <Route path="/groups/:id">
                            <Suspense fallback={<Loading/>}>
                                <AuthenticatedRoute>
                                    <Group/>
                                </AuthenticatedRoute>
                            </Suspense>
                        </Route>
                        <Route exact path="/groups/invite/:inviteToken">
                            <Suspense fallback={<Loading/>}>
                                <GroupInvite/>
                            </Suspense>
                        </Route>
                        <Route path="/profile">
                            <Suspense fallback={<Loading/>}>
                                <AuthenticatedRoute>
                                    <Profile/>
                                </AuthenticatedRoute>
                            </Suspense>
                        </Route>
                        <Route exact path="/404"><PageNotFound/></Route>
                    </Switch>
                </Router>
            )}
        </>
    );
}
