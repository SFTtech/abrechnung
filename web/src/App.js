import React, { Component, Fragment, Suspense } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import "bootswatch/dist/flatly/bootstrap.min.css";

import Index from "./components/Index";
import Header from "./components/Header";
import PrivateRoute from "./components/PrivateRoute";
import Alerts from "./components/Alerts";
import { connect } from "react-redux";
import { initSession } from "./store/authSlice";
import Spinner from "react-bootstrap/Spinner";
import Register from "./features/auth/Register";
import Login from "./features/auth/Login";
import PublicRoute from "./components/PublicRoute";
import Logout from "./features/auth/Logout";
import Group from "./features/groups/Group";
import "./App.css";

const Profile = React.lazy(() => import("./features/profile/Profile"));
const Groups = React.lazy(() => import("./features/groups/GroupList"));
const ConfirmEmailChange = React.lazy(() => import("./features/profile/ConfirmEmailChange"));
const ConfirmRegistration = React.lazy(() => import("./features/auth/ConfirmRegistration"));
const GroupInvite = React.lazy(() => import("./features/groups/GroupInvite"));

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
                            <Route exact path="/login" component={Login} />
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
                            <PrivateRoute path="/groups/:id" component={Group} />
                            <Route exact path="/groups/invite/:inviteToken">
                                <Suspense fallback={<Spinner />}>
                                    <GroupInvite />
                                </Suspense>
                            </Route>
                            <PrivateRoute path="/profile" component={Profile} />
                        </Switch>
                    </div>
                </Fragment>
            </Router>
        );
    }
}

export default connect(null, { initSession })(App);
