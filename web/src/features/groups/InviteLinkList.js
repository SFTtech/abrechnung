import React, {Component} from "react";
import {connect} from "react-redux";

import ListGroup from "react-bootstrap/cjs/ListGroup";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/cjs/Button";
import Datetime from "react-datetime";
import "react-datetime/css/react-datetime.css";
import PropTypes from "prop-types";
import Spinner from "react-bootstrap/Spinner";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faTrash} from "@fortawesome/free-solid-svg-icons/faTrash";
import {createInviteToken, deleteInviteToken, fetchInviteTokens} from "./groupsSlice";

class InviteLinkList extends Component {
    static propTypes = {
        group: PropTypes.object.isRequired,
    };

    state = {
        tokens: null,
        show: false,
        description: "",
        singleUse: false,
        validUntil: "",
    };

    componentDidMount = () => {
        this.props.fetchInviteTokens({groupID: this.props.group.id});
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
        this.setState({[e.target.name]: e.target.value});
    };

    deleteToken = (id) => {
        this.props.deleteInviteToken({groupID: this.props.group.id, tokenID: id});
    }

    onSubmit = (e) => {
        e.preventDefault();
        const {description, singleUse, validUntil} = this.state;
        this.props.createInviteToken({groupID: this.props.group.id, description, singleUse, validUntil})
            .then(val => {
                this.setState({show: false, description: "", singleUse: false, validUntil: ""});
            })
    };

    render() {
        const error = this.props.error !== null ? <div className="alert alert-danger">{this.props.error}</div> : "";
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
                <hr/>
                <ListGroup variant={"flush"}>
                    {this.props.group.tokens === undefined ? (
                        <div className={"d-flex justify-content-center"}>
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        </div>
                    ) : this.props.group.tokens.length === 0 ? (
                        <ListGroup.Item>No Links</ListGroup.Item>
                    ) : (
                        this.props.group.tokens.map((link, index) => (
                            <ListGroup.Item key={index} className={"d-flex justify-content-between"}>
                                <div>
                                    <span>{window.location.origin}/groups/invite/{link.token}</span>
                                    <br/>
                                    <small className={"text-muted"}>{link.description}</small>
                                </div>
                                <div>
                                    <button
                                        className="btn text-danger"
                                        onClick={() => this.deleteToken(link.id)}
                                    >
                                        <FontAwesomeIcon icon={faTrash}/>
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
                            {this.props.error !== null ? (
                                <div className="alert alert-danger">{this.props.error}</div>
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
                                    onChange={(e) => this.setState({validUntil: e})}
                                    value={this.state.validUntil}
                                />
                            </Form.Group>
                            <Form.Group controlId={"inviteLinkSingleUse"}>
                                <Form.Label>Single Use</Form.Label>
                                <Form.Check
                                    name={"singleUse"}
                                    onChange={(e) => {
                                        this.setState({singleUse: e.target.checked});
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
    status: state.groups.status,
    error: state.groups.error,
});

export default connect(mapStateToProps, {fetchInviteTokens, createInviteToken, deleteInviteToken})(InviteLinkList);
