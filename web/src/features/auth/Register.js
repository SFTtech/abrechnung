import React, {Component} from 'react';
import {Link, Redirect} from 'react-router-dom';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {register} from "./authSlice";
import {createMessage} from "../messages/messagesSlice";

class Register extends Component {
    state = {
        username: '',
        email: '',
        password: '',
        password2: '',
    };

    static propTypes = {
        register: PropTypes.func.isRequired,
        isAuthenticated: PropTypes.bool,
        status :PropTypes.string.isRequired,
    };

    onSubmit = (e) => {
        e.preventDefault();
        const {username, email, password, password2} = this.state;
        if (password !== password2) {
            this.props.createMessage({passwordNotMatch: 'Passwords do not match'});
        } else {
            this.props.register({username: username, email: email, password: password});
        }
    };

    onChange = (e) => this.setState({[e.target.name]: e.target.value});

    render() {
        if (this.props.isAuthenticated) {
            return <Redirect to="/"/>;
        }

        if (this.props.status === 'pending_registration') {
            return (
                <div className="col-md-6 m-auto">
                    <div className="card card-body mt-5">
                        <p>Registration successful, please confirm the link you received via email.</p>
                    </div>
                </div>
            )
        }

        const error = this.props.error !== null ? <div className="alert alert-danger">{this.props.error}</div> : "";

        const {username, email, password, password2} = this.state;
        return (
            <div className="col-md-6 m-auto">
                <div className="card card-body mt-5">
                    <h2 className="text-center">Register</h2>
                    {error}
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
                            <label>Email</label>
                            <input
                                type="email"
                                className="form-control"
                                name="email"
                                onChange={this.onChange}
                                value={email}
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
                            <label>Confirm Password</label>
                            <input
                                type="password"
                                className="form-control"
                                name="password2"
                                onChange={this.onChange}
                                value={password2}
                            />
                        </div>
                        <div className="form-group">
                            <button type="submit" className="btn btn-primary">
                                Register
                            </button>
                        </div>
                        <p>
                            Already have an account? <Link to="/login">Login</Link>
                        </p>
                    </form>
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

export default connect(mapStateToProps, {register, createMessage})(Register);
