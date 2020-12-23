import React, { Component } from "react";
import { connect } from "react-redux";

import ListGroup from "react-bootstrap/cjs/ListGroup";
import "react-datetime/css/react-datetime.css";
import PropTypes from "prop-types";
import { fetchGroupMembers, setGroupMemberPrivileges } from "./groupsSlice";
import Spinner from "react-bootstrap/Spinner";
import Badge from "react-bootstrap/cjs/Badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt } from "@fortawesome/free-solid-svg-icons/faPencilAlt";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/cjs/Button";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";

class GroupMemberList extends Component {
    static propTypes = {
        group: PropTypes.object.isRequired,
    };

    state = {
        // edit member vars
        showEditMemberModal: false,
        userID: null,
        canWrite: null,
        isOwner: null,
        // remove member vars
        showRemoveMemberModal: false,
        removeMember: null,
    };

    onEditMemberSave = (e) => {
        e.preventDefault();
        this.props.setGroupMemberPrivileges({
            groupID: this.props.group.id,
            userID: this.state.userID,
            canWrite: this.state.canWrite,
            isOwner: this.state.isOwner,
        });
    };

    closeEditMemberModal = () => {
        this.setState({ showEditMemberModal: false, isOwner: null, canWrite: null, userID: null });
    };

    openEditMemberModal = (userID) => {
        const user = this.props.group.members.find((user) => user.id === userID);
        if (user === undefined) {
            this.setState({ error: "user does not exist" });
        } else {
            this.setState({
                showEditMemberModal: true,
                isOwner: user.is_owner,
                canWrite: user.can_write,
                userID: user.id,
            });
        }
    };

    onRemoveMemberSave = () => {};

    closeRemoveMemberModal = () => {
        this.setState({ showRemoveMemberModal: false, removeMember: null });
    };

    openRemoveMemberModal = (userID) => {
        this.setState({ showRemoveMemberModal: true, removeMember: userID });
    };

    getMembers = () => {
        return this.props.group.members !== undefined ? this.props.group.members : null;
    };

    componentDidMount = () => {
        this.props.fetchGroupMembers({ groupID: this.props.group.id });
    };

    render() {
        return (
            <div>
                <h5>Members</h5>
                <hr />
                <ListGroup variant={"flush"}>
                    {this.getMembers() === null ? (
                        <div className={"d-flex justify-content-center"}>
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        </div>
                    ) : this.getMembers().length === 0 ? (
                        <ListGroup.Item>No Members</ListGroup.Item>
                    ) : (
                        this.getMembers().map((member, index) => (
                            <ListGroup.Item key={index}>
                                <div className={"d-flex justify-content-between"}>
                                    <div>
                                        <span>{member.username}</span>
                                        <span className={"ml-4"}>
                                            {member.is_owner ? (
                                                <Badge className={"ml-2"} variant={"success"}>
                                                    owner
                                                </Badge>
                                            ) : member.can_write ? (
                                                <Badge className={"ml-2"} variant={"success"}>
                                                    editor
                                                </Badge>
                                            ) : (
                                                ""
                                            )}
                                            {member.username === this.props.currentUser ? (
                                                <Badge className={"ml-2"} variant={"primary"}>
                                                    it's you
                                                </Badge>
                                            ) : (
                                                ""
                                            )}
                                        </span>
                                        <br />
                                        <small className="text-muted">
                                            {member.description}, joined {member.joined}
                                        </small>
                                    </div>
                                    {this.props.group.is_owner || this.props.group.can_write ? (
                                        <div>
                                            <button
                                                className="btn text-info"
                                                onClick={() => this.openEditMemberModal(member.id)}
                                            >
                                                <FontAwesomeIcon icon={faPencilAlt} />
                                            </button>
                                            <button
                                                className="btn text-danger"
                                                onClick={() => this.openRemoveMemberModal(member.id)}
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    ) : (
                                        ""
                                    )}
                                </div>
                            </ListGroup.Item>
                        ))
                    )}
                </ListGroup>
                <Modal show={this.state.showEditMemberModal} onHide={this.closeEditMemberModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Edit Group Member</Modal.Title>
                    </Modal.Header>

                    <Form onSubmit={this.onEditMemberSave}>
                        <Modal.Body>
                            {this.props.group.can_write ? (
                                <Form.Check
                                    type="switch"
                                    id="can-write"
                                    label="Can Write"
                                    checked={this.state.canWrite}
                                    onChange={(e) => this.setState({ canWrite: e.target.checked })}
                                />
                            ) : (
                                ""
                            )}
                            {this.props.group.is_owner ? (
                                <Form.Check
                                    type="switch"
                                    id="is-owner"
                                    label="Is Owner"
                                    value={this.state.isOwner}
                                    checked={this.state.isOwner}
                                    onChange={(e) => this.setState({ isOwner: e.target.checked })}
                                />
                            ) : (
                                ""
                            )}
                        </Modal.Body>

                        <Modal.Footer>
                            <Button variant="success" type={"submit"}>
                                Save
                            </Button>
                            <Button variant="outline-danger" onClick={this.closeEditMemberModal}>
                                Close
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
                <Modal show={this.state.showRemoveMemberModal} onHide={this.closeRemoveMemberModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Remove Member from Group</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        Are you sure you want to remove{" "}
                        <strong>
                            {this.state.removeMember !== null
                                ? this.props.group.members.find((user) => user.id === this.state.removeMember).username
                                : ""}
                        </strong>{" "}
                        from this group?
                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="success" type={"submit"} onClick={this.onRemoveMemberSave}>
                            Yes I'm sure.
                        </Button>
                        <Button variant="outline-danger" onClick={this.closeRemoveMemberModal}>
                            On second thought ...
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        );
    }
}

const mapStateToProps = (state) => ({
    status: state.groups.status,
    error: state.groups.error,
    currentUser: state.auth.user.username,
});

export default connect(mapStateToProps, { fetchGroupMembers, setGroupMemberPrivileges })(GroupMemberList);
