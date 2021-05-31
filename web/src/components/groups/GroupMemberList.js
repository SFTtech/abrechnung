import React, {useState} from "react";

import ListGroup from "react-bootstrap/cjs/ListGroup";
import "react-datetime/css/react-datetime.css";
import Badge from "react-bootstrap/cjs/Badge";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPencilAlt} from "@fortawesome/free-solid-svg-icons/faPencilAlt";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/cjs/Button";
import {faTrash} from "@fortawesome/free-solid-svg-icons/faTrash";
import {useRecoilValue} from "recoil";
import {groupMembers} from "../../recoil/groups";
import {userData} from "../../recoil/auth";

export default function GroupMemberList({group}) {
    const [state, setState] = useState({
        // edit member vars
        showEditMemberModal: false,
        userID: null,
        canWrite: null,
        isOwner: null,
        // remove member vars
        showRemoveMemberModal: false,
        removeMember: null,
    });
    const members = useRecoilValue(groupMembers(group.group_id));
    const currentUser = useRecoilValue(userData);

    const onEditMemberSave = (e) => {
        e.preventDefault();
        this.props.setGroupMemberPrivileges({
            groupID: this.props.group.id,
            userID: this.state.userID,
            canWrite: this.state.canWrite,
            isOwner: this.state.isOwner,
        });
    };

    const closeEditMemberModal = () => {
        setState({showEditMemberModal: false, isOwner: null, canWrite: null, userID: null});
    };

    const openEditMemberModal = (userID) => {
        const user = members.find((user) => user.id === userID);
        if (user === undefined) {
            setState({error: "user does not exist"});
        } else {
            setState({
                showEditMemberModal: true,
                isOwner: user.is_owner,
                canWrite: user.can_write,
                userID: user.id,
            });
        }
    };

    const onRemoveMemberSave = () => {
    };

    const closeRemoveMemberModal = () => {
        setState({showRemoveMemberModal: false, removeMember: null});
    };

    const openRemoveMemberModal = (userID) => {
        setState({showRemoveMemberModal: true, removeMember: userID});
    };

    return (
        <div>
            <ListGroup variant={"flush"}>
                {members.length === 0 ? (
                    <ListGroup.Item>No Members</ListGroup.Item>
                ) : (
                    members.map((member, index) => (
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
                                        {member.username === currentUser.username ? (
                                            <Badge className={"ml-2"} variant={"primary"}>
                                                it's you
                                            </Badge>
                                        ) : (
                                            ""
                                        )}
                                        </span>
                                    <br/>
                                    <small className="text-muted">
                                        {member.description}, joined {member.joined}
                                    </small>
                                </div>
                                {group.is_owner || group.can_write ? (
                                    <div>
                                        <button
                                            className="btn text-info"
                                            onClick={() => openEditMemberModal(member.id)}
                                        >
                                            <FontAwesomeIcon icon={faPencilAlt}/>
                                        </button>
                                        <button
                                            className="btn text-danger"
                                            onClick={() => openRemoveMemberModal(member.id)}
                                        >
                                            <FontAwesomeIcon icon={faTrash}/>
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
            <Modal show={state.showEditMemberModal} onHide={closeEditMemberModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Group Member</Modal.Title>
                </Modal.Header>

                <Form onSubmit={onEditMemberSave}>
                    <Modal.Body>
                        {group.can_write ? (
                            <Form.Check
                                type="switch"
                                id="can-write"
                                label="Can Write"
                                checked={state.canWrite}
                                onChange={(e) => setState({canWrite: e.target.checked})}
                            />
                        ) : (
                            ""
                        )}
                        {group.is_owner ? (
                            <Form.Check
                                type="switch"
                                id="is-owner"
                                label="Is Owner"
                                value={state.isOwner}
                                checked={state.isOwner}
                                onChange={(e) => setState({isOwner: e.target.checked})}
                            />
                        ) : (
                            ""
                        )}
                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="success" type={"submit"}>
                            Save
                        </Button>
                        <Button variant="outline-danger" onClick={closeEditMemberModal}>
                            Close
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
            <Modal show={state.showRemoveMemberModal} onHide={closeRemoveMemberModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Remove Member from Group</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    Are you sure you want to remove{" "}
                    <strong>
                        {state.removeMember !== null
                            ? members.find((user) => user.id === state.removeMember).username
                            : ""}
                    </strong>{" "}
                    from this group?
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="success" type={"submit"} onClick={onRemoveMemberSave}>
                        Yes I'm sure.
                    </Button>
                    <Button variant="outline-danger" onClick={closeRemoveMemberModal}>
                        On second thought ...
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
