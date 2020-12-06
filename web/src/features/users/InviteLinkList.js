import React, { Component } from "react";
import { connect } from "react-redux";

import ListGroup from "react-bootstrap/cjs/ListGroup";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/cjs/Button";
import Card from "react-bootstrap/cjs/Card";
import Datetime from "react-datetime";
import "react-datetime/css/react-datetime.css";
import PropTypes from "prop-types";

import { ws } from "../../websocket";
import { createInviteLink } from "./usersSlice";
import Spinner from "react-bootstrap/Spinner";

class InviteLinkList extends Component {
    static propTypes = {
        groupInviteTokens: PropTypes.any.isRequired,
        group: PropTypes.object.isRequired,
        auth: PropTypes.object.isRequired,
    };

    state = {
        show: false,
        description: "",
        singleUse: false,
        validUntil: "",
        status: "idle",
        error: null,
    };

    openModal = () => {
        this.setState({
            show: true,
        });
    };

    closeModal = () => {
        this.setState({
            show: false,
        });
    };

    onChange = (e) => {
        this.setState({ [e.target.name]: e.target.value });
    };

    onSubmit = (e) => {
        e.preventDefault();
        const { description, singleUse, validUntil } = this.state;
        this.setState({ status: "loading" });
        ws.call("group_invite", {
            authtoken: this.props.auth.sessionToken,
            grp: this.props.group.id,
            description: description,
            valid_until: validUntil,
            single_use: singleUse,
        })
            .then((value) => {
                this.setState({
                    status: "success",
                    error: null,
                    show: false,
                    description: "",
                    singleUse: false,
                    validUntil: "",
                });
                this.props.createInviteLink({
                    description: description,
                    single_use: singleUse,
                    valid_until: JSON.stringify(validUntil),
                    inviteToken: value[0].invite_token,
                });
            })
            .catch((error) => {
                this.setState({ status: "failed", error: error });
            });
    };

    render() {
        return (
            <Card className={"mt-3"}>
                <Card.Body>
                    <h5>
                        Active invite links{" "}
                        <Button className={"float-right"} onClick={this.openModal} variant={"success"}>
                            Invite
                        </Button>
                    </h5>
                    <hr />
                    <ListGroup variant={"flush"}>
                        {this.props.groupInviteTokens === null ? (
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        ) : this.props.groupInviteTokens.length === 0 ? (
                            <ListGroup.Item>No Links</ListGroup.Item>
                        ) : (
                            this.props.groupInviteTokens.map((link, index) => (
                                <ListGroup.Item key={index}>
                                    <div>{window.location.origin}/groups/invite/{link.inviteToken}</div>
                                </ListGroup.Item>
                            ))
                        )}
                    </ListGroup>
                </Card.Body>
                <Modal show={this.state.show} onHide={this.closeModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Create Invite Link</Modal.Title>
                    </Modal.Header>

                    <Form onSubmit={this.onSubmit}>
                        <Modal.Body>
                            {this.state.error !== null ? (
                                <div className="alert alert-danger">{this.state.error}</div>
                            ) : (
                                ""
                            )}
                            <Form.Group controlId={"inviteLinkDescription"}>
                                <Form.Label>Description</Form.Label>
                                <Form.Control
                                    type={"text"}
                                    name={"description"}
                                    onChange={this.onChange}
                                    value={this.state.description}
                                />
                            </Form.Group>
                            <Form.Group controlId={"inviteLinkValidUntil"}>
                                <Form.Label>Valid Until</Form.Label>
                                <Datetime
                                    name={"validUntil"}
                                    onChange={(e) => this.setState({ validUntil: e })}
                                    value={this.state.validUntil}
                                />
                            </Form.Group>
                            <Form.Group controlId={"inviteLinkSingleUse"}>
                                <Form.Label>Single Use</Form.Label>
                                <Form.Check name={"singleUse"} onChange={this.onChange} value={this.state.singleUse} />
                            </Form.Group>
                        </Modal.Body>

                        <Modal.Footer>
                            <Button variant="success" type={"submit"}>
                                Save
                            </Button>
                            <Button variant="outline-danger" onClick={this.closeModal}>
                                Close
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </Card>
        );
    }
}

const mapStateToProps = (state) => ({
    groupInviteTokens: state.users.groupInviteTokens,
    auth: state.auth,
});

export default connect(mapStateToProps, { createInviteLink })(InviteLinkList);
