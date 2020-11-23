import React, {Component, Fragment} from 'react';
import {BrowserRouter as Router, Route, Switch,} from "react-router-dom";

import "bootswatch/dist/flatly/bootstrap.min.css";

import Index from './components/Index'
import Header from './components/Header'
import PrivateRoute from './components/PrivateRoute'
import Alerts from "./components/Alerts";
import Register from './features/auth/Register';
import Login from './features/auth/Login';
import Profile from "./features/profile/Profile";
import {connect} from 'react-redux';
import ConfirmRegistration from "./features/auth/ConfirmRegistration";
import ConfirmEmailChange from "./features/profile/ConfirmEmailChange";
import {initSession} from "./features/auth/authSlice";
import './App.css';

class App extends Component {

    componentDidMount() {
        this.props.initSession();
    }

    render() {
        return (
            <Router>
                <Fragment>
                    <Header/>
                    <div className="container">
                        <Alerts/>
                        <Switch>
                            <Route exact path="/" component={Index}/>
                            <Route exact path="/register" component={Register}/>
                            <Route exact path="/login" component={Login}/>
                            <Route path="/confirm-registration/:token" component={ConfirmRegistration}/>
                            <Route path="/confirm-email-change/:token" component={ConfirmEmailChange}/>
                            <PrivateRoute exact path="/profile" component={Profile}/>
                        </Switch>
                    </div>
                </Fragment>
            </Router>
        );
    }
}

export default connect(null, {initSession})(App);
