import React, {useState} from "react";
import {ws} from "../../websocket";
import Spinner from "react-bootstrap/Spinner";
import "./ConfirmEmailChange.css";
import {useRouteMatch} from "react-router-dom";
import {toast} from "react-toastify";

export default function ConfirmEmailChange() {
    const [status, setStatus] = useState("idle");
    const match = useRouteMatch();

    const confirmEmail = (e) => {
        e.preventDefault();
        setStatus("loading");
        ws.call("confirm_email_change", {
            token: match.params.token,
        })
            .then(value => {
                setStatus("success");
            })
            .catch(error => {
                toast.error(`${error}`, {
                    position: "top-right",
                    autoClose: 5000,
                });
            });
    };

    if (status === "success") {
        return (
            <div className="col-md-8 col-sm-12 m-auto">
                <div className="card card-body mt-5">
                    <h4 className="text-center text-success">Confirmation successful</h4>
                </div>
            </div>
        );
    }

    return (
        <div className="col-md-8 col-sm-12 m-auto">
            <div className="card card-body mt-5">
                <h4 className="text-center">Confirm your new email</h4>
                {status === "loading" ? (
                    <div className="d-flex justify-content-center">
                        <Spinner animation="border" role="status">
                            <span className="sr-only">Loading...</span>
                        </Spinner>
                    </div>
                ) : (
                    <p>
                        Click{" "}
                        <button className={"button-link text-success"} onClick={confirmEmail}>
                            here
                        </button>
                        {" "}
                        to confirm your new email.
                    </p>
                )}
            </div>
        </div>
    );
}
