import React, {useEffect, useState} from "react";
import {useHistory, useRouteMatch} from "react-router-dom";

import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";
import "react-datetime/css/react-datetime.css";
import Spinner from "react-bootstrap/Spinner";
import Card from "react-bootstrap/cjs/Card";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCheck, faTimes} from "@fortawesome/free-solid-svg-icons";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import {LinkContainer} from "react-router-bootstrap";

import {ws} from "../websocket";
import Button from "react-bootstrap/Button";
import {useRecoilValue} from "recoil";
import {isAuthenticated, sessionToken} from "../recoil/auth";

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
        <Row className={"justify-content-center"}>
            <Col md={8} xs={12}>
                {status === "loading" ? (
                    <div className="d-flex justify-content-center">
                        <Spinner animation="border" role="status">
                            <span className="sr-only">Loading...</span>
                        </Spinner>
                    </div>
                ) : (
                    <Card>
                        <Card.Body>
                            {error !== null ? <div className="alert alert-danger">{error}</div> : ""}
                            <h4>You have been invited to group {group.group_name}</h4>
                            <hr/>
                            <ListGroup variant={"flush"}>
                                <ListGroup.Item className={"d-flex"}>
                                    <span className={"font-weight-bold w-25"}>Name</span>
                                    <span>{group.group_name}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className={"d-flex"}>
                                    <span className={"font-weight-bold w-25"}>Description</span>
                                    <span>{group.group_description}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className={"d-flex"}>
                                    <span className={"font-weight-bold w-25"}>Created At</span>
                                    <span>{group.group_created}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className={"d-flex"}>
                                    <span className={"font-weight-bold w-25"}>Invitation Description</span>
                                    <span>{group.invite_description}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className={"d-flex"}>
                                    <span className={"font-weight-bold w-25"}>Invitation Valid Until</span>
                                    <span>{group.invite_valid_until}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className={"d-flex"}>
                                    <span className={"font-weight-bold w-25"}>Invitation Single Use</span>
                                    <span>
                                            group.invite_single_use ? (
                                                <FontAwesomeIcon icon={faCheck}/>
                                            ) : (
                                                <FontAwesomeIcon icon={faTimes}/>
                                            )}
                                        </span>
                                </ListGroup.Item>
                            </ListGroup>
                            <hr/>
                            <Row className={"justify-content-center"}>
                                {loggedIn ? (
                                    <Button variant={"success"} onClick={join}>Join</Button>
                                ) : (
                                    <LinkContainer to={"/login?next=" + match.url}>
                                        <Button variant={"success"}>Join</Button>
                                    </LinkContainer>
                                )}
                            </Row>
                        </Card.Body>
                    </Card>
                )}
            </Col>
        </Row>
    );
}

