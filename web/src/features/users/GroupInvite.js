import React, { Component } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";

import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";
import "react-datetime/css/react-datetime.css";
import Spinner from "react-bootstrap/Spinner";
import Card from "react-bootstrap/cjs/Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import { LinkContainer } from "react-router-bootstrap";

import { ws } from "../../websocket";
import Button from "react-bootstrap/Button";

class GroupInvite extends Component {
    state = {
        group: null,
        status: "loading",
        error: null,
    };

    componentDidMount = () => {
        this.setState({ status: "loading" });
        ws.call("group_preview", {
            invite_token: this.props.match.params.inviteToken,
        })
            .then((value) => {
                this.setState({
                    status: "success",
                    error: null,
                    group: value[0],
                });
            })
            .catch((error) => {
                this.setState({ status: "failed", error: error });
            });
    };

    render() {
        const error = this.state.error !== null ? <div className="alert alert-danger">{this.state.error}</div> : "";

        return (
            <Row className={"justify-content-center"}>
                <Col md={8} xs={12}>
                    {this.state.status === "loading" ? (
                        <div className="d-flex justify-content-center">
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        </div>
                    ) : (
                        <Card>
                            <Card.Body>
                                {error}
                                <h4>You have been invited to group {this.state.group.group_name}</h4>
                                <hr />
                                <ListGroup variant={"flush"}>
                                    <ListGroup.Item className={"d-flex"}>
                                        <span className={"font-weight-bold w-25"}>Name</span>
                                        <span>{this.state.group.group_name}</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item className={"d-flex"}>
                                        <span className={"font-weight-bold w-25"}>Description</span>
                                        <span>{this.state.group.group_description}</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item className={"d-flex"}>
                                        <span className={"font-weight-bold w-25"}>Created At</span>
                                        <span>{this.state.group.group_created}</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item className={"d-flex"}>
                                        <span className={"font-weight-bold w-25"}>Invitation Description</span>
                                        <span>{this.state.group.invite_description}</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item className={"d-flex"}>
                                        <span className={"font-weight-bold w-25"}>Invitation Valid Until</span>
                                        <span>{this.state.group.invite_valid_until}</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item className={"d-flex"}>
                                        <span className={"font-weight-bold w-25"}>Invitation Single Use</span>
                                        <span>
                                            {this.state.group.invite_single_use ? (
                                                <FontAwesomeIcon icon={faCheck} />
                                            ) : (
                                                <FontAwesomeIcon icon={faTimes} />
                                            )}
                                        </span>
                                    </ListGroup.Item>
                                </ListGroup>
                                <hr />
                                <Row className={"justify-content-center"}>
                                    {this.props.isAuthenticated ? (
                                        <LinkContainer to={"/join"}>
                                            <Button variant={"success"}>Join</Button>
                                        </LinkContainer>
                                    ) : (
                                        <LinkContainer to={"/login"}>
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
}

const mapStateToProps = (state) => ({
    status: state.users.status,
    error: state.users.error,
    isAuthenticated: state.auth.isAuthenticated,
});

export default withRouter(connect(mapStateToProps, null)(GroupInvite));
