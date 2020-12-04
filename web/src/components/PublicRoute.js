import React, {Suspense} from 'react';
import {Redirect, Route} from 'react-router-dom';
import {connect} from 'react-redux';
import Spinner from "react-bootstrap/Spinner";

const PublicRoute = ({component: Component, status, isAuthenticated, ...rest}) => (
        <Route
            {...rest}
            render={(props) => {
                if (status === 'loading' || status === 'init') {
                    return (
                        <div className={"d-flex justify-content-center mt-5"}>
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        </div>
                    );
                }

                if (isAuthenticated) {
                    return <Redirect to="/"/>;
                }
                return (
                    <Suspense fallback={<Spinner/>}>
                        <Component {...props} />
                    </Suspense>
                );
            }}
        />
    )
;

const mapStateToProps = (state) => ({
    status: state.auth.status,
    isAuthenticated: state.auth.isAuthenticated,
});

export default connect(mapStateToProps)(PublicRoute);
