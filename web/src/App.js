import React, {Component, Fragment} from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

import "bootswatch/dist/cosmo/bootstrap.min.css";

import Index from './components/Index'
import Header from './components/Header'
import PrivateRoute from './components/PrivateRoute'
import Register from './features/auth/Register';
import Login from './features/auth/Login';
import './App.css';

class App extends Component {
    componentWillMount() {

    }

    render() {
        return (
            <Router>
                <Fragment>
                    <Header/>
                    <div className="container">
                        <Switch>
                            <Route exact path="/" component={Index}/>
                            <Route exact path="/register" component={Register}/>
                            <Route exact path="/login" component={Login}/>
                            <PrivateRoute exact path="/ssn-admin" component={Index}/>
                        </Switch>
                    </div>
                </Fragment>
            </Router>
        );
    }
}

export default App;
