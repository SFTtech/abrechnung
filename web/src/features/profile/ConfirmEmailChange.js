import React, {Component} from 'react';
import {ws} from "../../websocket";
import {Spinner} from "react-bootstrap";
import "./ConfirmEmailChange.css";

class ConfirmEmailChange extends Component {
    state = {
        error: null,
        status: 'idle' // or loading, success, failed
    };

    confirmEmail = (e) => {
        e.preventDefault()
        this.setState({status: 'loading'})
        ws.call("confirm_email_change", {
            token: this.props.match.params.token,
        }).then(value => {
            this.setState({status: 'success', error: null})
        }).catch(error => {
            this.setState({status: 'failed', error: error})
        });
    };

    render() {
        if (this.state.status === 'success') {
            return (
                <div className="col-md-8 col-sm-12 m-auto">
                    <div className="card card-body mt-5">
                        <h4 className="text-center text-success">Confirmation successful</h4>
                    </div>
                </div>
            )
        }

        return (
            <div className="col-md-8 col-sm-12 m-auto">
                <div className="card card-body mt-5">
                    <h4 className="text-center">Confirm your new email</h4>
                    {this.state.error !== null ? (
                        <div className="alert alert-danger">{this.state.error}</div>
                    ) : ""}
                    {this.state.status === 'loading' ? (
                        <div className="d-flex justify-content-center">
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        </div>
                    ) : (
                        <p>Click <button className={"button-link text-success"}
                                         onClick={this.confirmEmail}>here</button> to confirm your new email.</p>
                    )}
                </div>
            </div>
        );
    }
}

export default ConfirmEmailChange;
