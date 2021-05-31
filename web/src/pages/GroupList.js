import React, {useState} from "react";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";
import Button from "react-bootstrap/cjs/Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faTrash} from "@fortawesome/free-solid-svg-icons";
import {Link} from "react-router-dom";
import Layout from "../components/Layout";
import {useRecoilValue} from "recoil";
import {groupList} from "../recoil/groups";
import GroupCreateModal from "../components/groups/GroupCreateModal";
import GroupDeleteModal from "../components/groups/GroupDeleteModal";

export default function GroupList() {
    const [showGroupCreationModal, setShowGroupCreationModal] = useState(false);
    const [showGroupDeletionModal, setShowGroupDeletionModal] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const groups = useRecoilValue(groupList);

    const openGroupDeletionModal = (groupID) => {
        setGroupToDelete(groups.find(group => group.group_id === groupID));
        setShowGroupDeletionModal(true);
    };

    const closeGroupDeletionModal = () => {
        setGroupToDelete(null);
        setShowGroupDeletionModal(false);
    };

    return (
        <Layout title="Groups">
            <Row>
                <Col xs={12}>
                    <h3>Groups</h3>
                    <hr/>
                    <Row>
                        <Col md={6} xs={12}>
                            <ListGroup>
                                {groups.length === 0 ? (
                                    <ListGroup.Item key={0}>
                                        <span>No Groups</span>
                                    </ListGroup.Item>
                                ) : (
                                    groups.map(group => {
                                        return (
                                            <ListGroup.Item
                                                key={group.group_id}
                                                className={"d-flex justify-content-between"}
                                            >
                                                <div>
                                                        <span>
                                                            <Link
                                                                to={"/groups/" + group.group_id}>{group.name}</Link>
                                                        </span>
                                                    <br/>
                                                    <small
                                                        className="text-muted">{group.description}</small>
                                                </div>
                                                <div>
                                                    <button
                                                        className="btn text-danger"
                                                        onClick={() => openGroupDeletionModal(group.group_id)}
                                                    >
                                                        <FontAwesomeIcon icon={faTrash}/>
                                                    </button>
                                                </div>
                                            </ListGroup.Item>
                                        );
                                    })
                                )}
                            </ListGroup>
                        </Col>
                        <Col md={6} xs={12}>
                            <Button variant={"success"} onClick={() => setShowGroupCreationModal(true)}>
                                New
                            </Button>
                        </Col>
                    </Row>
                    <GroupCreateModal show={showGroupCreationModal} onClose={() => setShowGroupCreationModal(false)}/>
                    <GroupDeleteModal show={showGroupDeletionModal} onClose={closeGroupDeletionModal}
                                      groupToDelete={groupToDelete}/>
                </Col>
            </Row>
        </Layout>
    );
}
