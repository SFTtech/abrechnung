import React, {Component} from 'react';
import {Link} from 'react-router-dom';
import {ws} from "../../websocket";
import {Spinner} from "react-bootstrap";
import {connect} from "react-redux";

class ChangePassword extends Component {
    state = {
        error: null,
        status: 'idle', // or loading, success, failed
        password: '',
        newPassword: '',
        newPassword2: '',
    };

    onSubmit = (e) => {
        e.preventDefault()

        const {password, newPassword, newPassword2} = this.state;
        if (newPassword !== newPassword2) {
            this.setState({error: 'Passwords do not match'});
        } else {
            this.setState({status: 'loading'})
            ws.call("change_password", {
                authtoken: this.props.authtoken,
                password: password,
                new_password: newPassword,
            }).then(value => {
                this.setState({status: 'success', error: null, password: '', newPassword: '', newPassword2: ''})
            }).catch(error => {
                this.setState({status: 'failed', error: error})
            });
        }
    };

    onChange = (e) => this.setState({[e.target.name]: e.target.value});

    render() {
        const {password, newPassword, newPassword2} = this.state;
        return (
            <>
                {this.state.error !== null ? (
                    <div className="alert alert-danger">{this.state.error}</div>
                ) : ""}
                {this.state.status === 'loading' ? (
                    <div className="d-flex justify-content-center">
                        <Spinner animation="border" role="status">
                            <span className="sr-only">Loading...</span>
                        </Spinner>
                    </div>
                ) : ""}
                {this.state.status === 'success' ? (
                    <div className="alert alert-success">
                        Password changed successfully.
                    </div>
                ) : ""}

                <form onSubmit={this.onSubmit}>
                    <div className="form-group">
                        <label>Current Password</label>
                        <input
                            type="password"
                            className="form-control"
                            name="password"
                            onChange={this.onChange}
                            value={password}
                        />
                    </div>
                    <div className="form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            className="form-control"
                            name="newPassword"
                            onChange={this.onChange}
                            value={newPassword}
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            className="form-control"
                            name="newPassword2"
                            onChange={this.onChange}
                            value={newPassword2}
                        />
                    </div>
                    <div className="form-group">
                        <button type="submit" className="btn btn-primary">
                            Save
                        </button>
                    </div>
                </form>
            </>
        );
    }
}

const mapStateToProps = (state) => ({
    authtoken: state.auth.sessionToken,
});

export default connect(mapStateToProps)(ChangePassword);
