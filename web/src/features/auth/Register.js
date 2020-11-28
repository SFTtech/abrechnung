import React, {Component} from 'react';
import {Link, Redirect} from 'react-router-dom';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {ws} from "../../websocket";
import Spinner from "react-bootstrap/Spinner";

class Register extends Component {
    state = {
        username: '',
        email: '',
        password: '',
        password2: '',
        error: null,
        status: 'idle' // or loading, success, failed
    };

    static propTypes = {
        isAuthenticated: PropTypes.bool,
    };

    onSubmit = (e) => {
        e.preventDefault();
        const {username, email, password, password2} = this.state;
        if (password !== password2) {
            this.setState({error: 'Passwords do not match'});
        } else {
            this.setState({status: 'loading'})
            ws.call("register_user", {
                email: email,
                username: username,
                password: password
            }).then(value => {
                this.setState({status: 'success', error: null})
            }).catch(error => {
                this.setState({status: 'failed', error: error})
            });
        }
    };

    onChange = (e) => this.setState({[e.target.name]: e.target.value});

    render() {
        if (this.props.isAuthenticated) {
            return <Redirect to="/"/>;
        }

        if (this.state.status === 'success') {
            return (
                <div className="col-md-6 m-auto">
                    <div className="card card-body mt-5">
                        <h4 className="text-center text-success">Registration successful</h4>
                        <p>Registration successful, please confirm the follow link you received via email to confirm your registration.</p>
                    </div>
                </div>
            )
        }

        const {username, email, password, password2} = this.state;
        return (
            <div className="col-md-6 m-auto">
                <div className="card card-body mt-5">
                    <h2 className="text-center">Register</h2>
                    {this.state.error !== null ? (
                        <div className="alert alert-danger">{this.state.error}</div>
                    ) : ""}
                    {this.state.status === 'loading' ? (
                        <div className="d-flex justify-content-center">
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        </div>
                    ) : ''}
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
});

export default connect(mapStateToProps)(Register);
