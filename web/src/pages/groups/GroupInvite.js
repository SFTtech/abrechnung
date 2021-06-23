import React, {useEffect, useState} from "react";
import {Link, useHistory, useRouteMatch} from "react-router-dom";
import "react-datetime/css/react-datetime.css";
import Spinner from "react-bootstrap/Spinner";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCheck, faTimes} from "@fortawesome/free-solid-svg-icons";

import {ws} from "../../websocket";
import {useRecoilValue} from "recoil";
import {isAuthenticated, sessionToken} from "../../recoil/auth";

export default function GroupInvite() {
    const [group, setGroup] = useState(null);
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState(null);
    const history = useHistory();
    const match = useRouteMatch();
    const token = useRecoilValue(sessionToken);
    const loggedIn = useRecoilValue(isAuthenticated);

    useEffect(() => {
        setStatus("loading");
        ws.call("group_preview", {
            invite_token: match.params.inviteToken,
        })
            .then((value) => {
                setStatus("success");
                setError(null);
                setGroup(value[0]);
            })
            .catch((error) => {
                setStatus("failed");
                setError(error)
            });
    }, [status, error, setGroup, setStatus, setError, history, match]);

    const join = () => {
        console.log("joining group");
        ws.call("group_join", {
            authtoken: token,
            invite_token: match.params.inviteToken,
        })
            .then((value) => {
                setStatus("success");
                setError(null);
                history.push("/groups");
            })
            .catch((error) => {
                setStatus("failed");
                setError(error)
            });
    };


    return (
        <div className="row justify-content-center">
            <div className="col-md-8 col-xs-12">
                {status === "loading" ? (
                    <div className="d-flex justify-content-center">
                        <Spinner animation="border" role="status">
                            <span className="sr-only">Loading...</span>
                        </Spinner>
                    </div>
                ) : (
                    <div className="card">
                        <div className="card-body">
                            {error !== null ? <div className="alert alert-danger">{error}</div> : ""}
                            <h4>You have been invited to group {group.group_name}</h4>
                            <hr/>
                            <div className="list-group list-group-flush">
                                <div className="list-group-item d-flex">
                                    <span className="font-weight-bold w-25">Name</span>
                                    <span>{group.group_name}</span>
                                </div>
                                <div className="list-group-item d-flex">
                                    <span className="font-weight-bold w-25">Description</span>
                                    <span>{group.group_description}</span>
                                </div>
                                <div className="list-group-item d-flex">
                                    <span className="font-weight-bold w-25">Created At</span>
                                    <span>{group.group_created}</span>
                                </div>
                                <div className="list-group-item d-flex">
                                    <span className="font-weight-bold w-25">Invitation Description</span>
                                    <span>{group.invite_description}</span>
                                </div>
                                <div className="list-group-item d-flex">
                                    <span className="font-weight-bold w-25">Invitation Valid Until</span>
                                    <span>{group.invite_valid_until}</span>
                                </div>
                                <div className="list-group-item d-flex">
                                    <span className="font-weight-bold w-25">Invitation Single Use</span>
                                    <span>
                                            group.invite_single_use ? (
                                                <FontAwesomeIcon icon={faCheck}/>
                                            ) : (
                                                <FontAwesomeIcon icon={faTimes}/>
                                            )}
                                        </span>
                                </div>
                            </div>
                            <hr/>
                            <div className="row justify-content-center">
                                {loggedIn ? (
                                    <button className="btn btn-success" onClick={join}>Join</button>
                                ) : (
                                    <Link className="btn btn-success" to={"/login?next=" + match.url}>Join</Link>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

