import React, { Component } from "react";
import { connect } from "react-redux";

import ListGroup from "react-bootstrap/cjs/ListGroup";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/cjs/Button";
import Datetime from "react-datetime";
import "react-datetime/css/react-datetime.css";
import PropTypes from "prop-types";
import Spinner from "react-bootstrap/Spinner";
import { ws } from "../../websocket";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { refreshGroupLog } from "./usersSlice";

class InviteLinkList extends Component {
    static propTypes = {
        group: PropTypes.object.isRequired,
        auth: PropTypes.object.isRequired,
    };

    state = {
        tokens: null,
        show: false,
        description: "",
        singleUse: false,
        validUntil: "",
        error: null,
    };

    fetchInviteTokens = () => {
        ws.call("group_invite_list", {
            authtoken: this.props.auth.sessionToken,
            group_id: this.props.group.id,
            only_mine: false,
        })
            .then((value) => {
                this.setState({ status: "idle", error: null, tokens: value });
            })
            .catch((error) => {
                this.setState({ status: "failed", error: error });
            });
    };

    componentDidMount = () => {
        this.fetchInviteTokens();
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

    deleteInviteToken = (id) => {
        ws.call("group_invite_delete", {
            authtoken: this.props.auth.sessionToken,
            group_id: this.props.group.id,
            invite_id: id,
        })
            .then((value) => {
                this.setState({
                    status: "success",
                    error: null,
                    tokens: this.state.tokens.filter((token) => token.id !== id),
                });
            })
            .catch((error) => {
                this.setState({ status: "failed", error: error });
            });
    }

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
                    tokens: [
                        ...this.state.tokens,
                        {
                            description: description,
                            single_use: singleUse,
                            valid_until: JSON.stringify(validUntil),
                            token: value[0].invite_token,
                        },
                    ],
                });
                this.props.refreshGroupLog(this.props.group.id);
            })
            .catch((error) => {
                this.setState({ status: "failed", error: error });
            });
    };

    render() {
        const error = this.state.error !== null ? <div className="alert alert-danger">{this.state.error}</div> : "";
        // TODO: not hardcode the invite url here
        return (
            <div>
                {error}
                <h5>
                    Active invite links{" "}
                    <Button className={"float-right"} onClick={this.openModal} variant={"success"}>
                        Invite
                    </Button>
                </h5>
                <hr />
                <ListGroup variant={"flush"}>
                    {this.state.tokens === null ? (
                        <div className={"d-flex justify-content-center"}>
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        </div>
                    ) : this.state.tokens.length === 0 ? (
                        <ListGroup.Item>No Links</ListGroup.Item>
                    ) : (
                        this.state.tokens.map((link, index) => (
                            <ListGroup.Item key={index} className={"d-flex justify-content-between"}>
                                <div>
                                    <span>{window.location.origin}/groups/invite/{link.token}</span>
                                    <br/>
                                    <small className={"text-muted"}>{link.description}</small>
                                </div>
                                <div>
                                    <button
                                        className="btn text-danger"
                                        onClick={() => this.deleteInviteToken(link.id)}
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>
                            </ListGroup.Item>
                        ))
                    )}
                </ListGroup>
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
                                <Form.Check
                                    name={"singleUse"}
                                    onChange={(e) => {
                                        this.setState({ singleUse: e.target.checked });
                                    }}
                                    checked={this.state.singleUse}
                                />
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
            </div>
        );
    }
}

const mapStateToProps = (state) => ({
    auth: state.auth,
});

export default connect(mapStateToProps, {refreshGroupLog})(InviteLinkList);
