import React from 'react';
import {Redirect, Route} from 'react-router-dom';
import {connect} from 'react-redux';
import Spinner from "./common/Spinner";

const PrivateRoute = ({component: Component, status, isAuthenticated, ...rest}) => (
    <Route
        {...rest}
        render={(props) => {
            if (status === 'loading') {
                return <Spinner/>;
            }

            if (!isAuthenticated) {
                return <Redirect to="/login"/>;
            }

            return <Component {...props} />;
        }}
    />
);

const mapStateToProps = (state) => ({
    status: state.auth.status,
    isAuthenticated: state.auth.isAuthenticated,
});

export default connect(mapStateToProps)(PrivateRoute);
