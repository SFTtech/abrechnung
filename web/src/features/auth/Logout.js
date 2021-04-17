import React, { Component } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";
import Spinner from "react-bootstrap/Spinner";

import { logout } from "../../store/authSlice";

class Logout extends Component {
    static propTypes = {
        logout: PropTypes.func.isRequired,
        isAuthenticated: PropTypes.bool,
    };

    componentDidMount() {
        this.props.logout();
    }

    render() {
        if (!this.props.isAuthenticated) {
            return <Redirect to="/login" />;
        }

        return (
            <div className="container">
                <div className="col-md-6 m-auto">
                    <div className="card card-body mt-5">
                        <div className="d-flex justify-content-center">
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = (state) => ({
    isAuthenticated: state.auth.isAuthenticated,
    status: state.auth.status,
    error: state.auth.error,
});

export default connect(mapStateToProps, { logout })(Logout);
