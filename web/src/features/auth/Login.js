import React, { Component } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";
import Spinner from "react-bootstrap/Spinner";
import queryString from "query-string";

import { login } from "./authSlice";

class Login extends Component {
    state = {
        username: "",
        password: "",
    };

    static propTypes = {
        login: PropTypes.func.isRequired,
        isAuthenticated: PropTypes.bool,
    };

    onSubmit = (e) => {
        e.preventDefault();
        const sessionName = navigator.appVersion + " " + navigator.userAgent + " " + navigator.appName;
        this.props.login({ username: this.state.username, password: this.state.password, sessionName: sessionName });
    };

    onChange = (e) => this.setState({ [e.target.name]: e.target.value });

    render() {
        if (this.props.isAuthenticated) {
            let params = queryString.parse(this.props.location.search);
            if (params.next !== null && params.next !== undefined && params.next.startsWith("/")) {
                return <Redirect to={params.next} />;
            }
            return <Redirect to="/" />;
        }

        const { username, password } = this.state;
        return (
            <div className="container">
                <div className="col-md-6 m-auto">
                    <div className="card card-body mt-5">
                        <h2 className="text-center">Login</h2>
                        {this.props.error !== null ? <div className="alert alert-danger">{this.props.error}</div> : ""}
                        {this.props.status === "loading" ? (
                            <div className="d-flex justify-content-center">
                                <Spinner animation="border" role="status">
                                    <span className="sr-only">Loading...</span>
                                </Spinner>
                            </div>
                        ) : (
                            ""
                        )}
                        <form onSubmit={this.onSubmit}>
                            <div className="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="username"
                                    onChange={this.onChange}
                                    value={username}
                                />
                            </div>

                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    name="password"
                                    onChange={this.onChange}
                                    value={password}
                                />
                            </div>

                            <div className="form-group">
                                <button type="submit" className="btn btn-primary">
                                    Login
                                </button>
                            </div>
                        </form>
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

export default connect(mapStateToProps, { login })(Login);
