import React, { Component, Fragment, Suspense } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import "bootswatch/dist/flatly/bootstrap.min.css";

import Index from "./components/Index";
import Header from "./components/Header";
import PrivateRoute from "./components/PrivateRoute";
import Alerts from "./components/Alerts";
import { connect } from "react-redux";
import { initSession } from "./features/auth/authSlice";
import Spinner from "react-bootstrap/Spinner";
import Register from "./features/auth/Register";
import Login from "./features/auth/Login";
import PublicRoute from "./components/PublicRoute";
import Logout from "./features/auth/Logout";
import GroupDetail from "./features/users/GroupDetail";
import GroupInvite from "./features/users/GroupInvite";
import "./App.css";

const Profile = React.lazy(() => import("./features/profile/Profile"));
const Groups = React.lazy(() => import("./features/users/Groups"));
const ConfirmEmailChange = React.lazy(() => import("./features/profile/ConfirmEmailChange"));
const ConfirmRegistration = React.lazy(() => import("./features/auth/ConfirmRegistration"));

class App extends Component {
    componentDidMount() {
        this.props.initSession();
    }

    render() {
        return (
            <Router>
                <Fragment>
                    <Header />
                    <div className="container">
                        <Alerts />
                        <Switch>
                            <PublicRoute exact path="/register" component={Register} />
                            <PublicRoute exact path="/login" component={Login} />
                            <Route path="/confirm-registration/:token">
                                <Suspense fallback={<Spinner />}>
                                    <ConfirmRegistration />
                                </Suspense>
                            </Route>
                            <Route path="/confirm-email-change/:token">
                                <Suspense fallback={<Spinner />}>
                                    <ConfirmEmailChange />
                                </Suspense>
                            </Route>
                            <PrivateRoute exact path="/logout" component={Logout} />
                            <PrivateRoute exact path="/" component={Index} />
                            <PrivateRoute exact path="/groups" component={Groups} />
                            <PrivateRoute exact path="/groups/:id" component={GroupDetail} />
                            <Route exact path="/groups/invite/:inviteToken" component={GroupInvite} />
                            <PrivateRoute path="/profile/:tab?" component={Profile} />
                        </Switch>
                    </div>
                </Fragment>
            </Router>
        );
    }
}

export default connect(null, { initSession })(App);
