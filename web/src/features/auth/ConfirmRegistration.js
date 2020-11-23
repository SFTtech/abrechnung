import React, {Component} from 'react';
import {Link} from 'react-router-dom';
import {ws} from "../../websocket";
import {Spinner} from "react-bootstrap";
import "./ConfirmRegistration.css";

class ConfirmRegistration extends Component {
    state = {
        error: null,
        status: 'idle' // or loading, success, failed
    };

    confirmEmail = (e) => {
        e.preventDefault()
        this.setState({status: 'loading'})
        ws.call("confirm_registration", {
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
                        <p>Please <Link to={"/login"}>login</Link> using your credentials.</p>
                    </div>
                </div>
            )
        }

        return (
            <div className="col-md-8 col-sm-12 m-auto">
                <div className="card card-body mt-5">
                    <h4 className="text-center">Confirm Registration</h4>
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
                                         onClick={this.confirmEmail}>here</button> to confirm your registration.</p>
                    )}
                </div>
            </div>
        );
    }
}

export default ConfirmRegistration;
