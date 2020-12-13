import React, { Component } from "react";
import { ws } from "../../websocket";
import Spinner from "react-bootstrap/Spinner";
import { connect } from "react-redux";

class ChangeEmail extends Component {
    state = {
        error: null,
        status: "idle", // or loading, success, failed
        password: "",
        email: "",
    };

    onSubmit = (e) => {
        e.preventDefault();

        const { password, email } = this.state;
        this.setState({ status: "loading" });
        ws.call("request_email_change", {
            authtoken: this.props.authtoken,
            password: password,
            new_email: email,
        })
            .then((value) => {
                this.setState({ status: "success", error: null, password: "", email: "" });
            })
            .catch((error) => {
                this.setState({ status: "failed", error: error });
            });
    };

    onChange = (e) => this.setState({ [e.target.name]: e.target.value });

    render() {
        const { email, password } = this.state;
        return (
            <form onSubmit={this.onSubmit}>
                {this.state.error !== null ? <div className="alert alert-danger">{this.state.error}</div> : ""}
                {this.state.status === "loading" ? (
                    <div className="d-flex justify-content-center">
                        <Spinner animation="border" role="status">
                            <span className="sr-only">Loading...</span>
                        </Spinner>
                    </div>
                ) : (
                    ""
                )}
                {this.state.status === "success" ? (
                    <div className="alert alert-success">
                        Email changed successfully. You will shortly receive an email with a link to confirm your new
                        address.
                    </div>
                ) : (
                    ""
                )}

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
                    <label>New Email</label>
                    <input type="email" className="form-control" name="email" onChange={this.onChange} value={email} />
                </div>
                <div className="form-group">
                    <button type="submit" className="btn btn-primary">
                        Save
                    </button>
                </div>
            </form>
        );
    }
}

const mapStateToProps = (state) => ({
    authtoken: state.auth.sessionToken,
});

export default connect(mapStateToProps)(ChangeEmail);
