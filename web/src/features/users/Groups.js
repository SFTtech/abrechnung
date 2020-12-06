import React, { Component } from "react";
import { connect } from "react-redux";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";
import Button from "react-bootstrap/cjs/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

import { createGroup, deleteGroup, fetchGroups } from "./usersSlice";
import { Link } from "react-router-dom";
import Spinner from "react-bootstrap/Spinner";

class Groups extends Component {
    state = {
        showGroupCreationModal: false,
        showGroupDeletionModal: false,
        groupToDelete: null,
        groupName: "",
        groupDescription: "",
    };

    onGroupSave = (e) => {
        console.log(e);
        e.preventDefault();
        this.props.createGroup({ name: this.state.groupName, description: this.state.groupDescription });
        this.setState({
            showGroupCreationModal: false,
            groupName: "",
            groupDescription: "",
        });
    };

    openGroupCreationModal = () => {
        this.setState({
            showGroupCreationModal: true,
            showGroupDeletionModal: false,
        });
    };

    closeGroupCreationModal = () => {
        this.setState({ showGroupCreationModal: false });
    };

    openGroupDeletionModal = (groupID) => {
        this.setState({
            groupToDelete: groupID,
            showGroupCreationModal: false,
            showGroupDeletionModal: true,
        });
    };

    closeGroupDeletionModal = () => {
        this.setState({ groupToDelete: null, showGroupDeletionModal: false });
    };

    confirmDeleteGroup = () => {
        if (this.state.groupToDelete !== null) {
            this.props.deleteGroup({ group: this.state.groupToDelete });
            this.setState({ groupToDelete: null, showGroupDeletionModal: false });
        }
    };

    componentDidMount = () => {
        if (this.props.groups === null) {
            this.props.fetchGroups();
        }
    };

    onChange = (e) => {
        this.setState({ [e.target.name]: e.target.value });
    };

    render() {
        const error = this.props.error !== null ? <div className="alert alert-danger">{this.props.error}</div> : "";
        return (
            <Row>
                <Col xs={12}>
                    <h3>Groups</h3>
                    {error}
                    <hr />
                    <Row>
                        <Col md={6} xs={12}>
                            {this.props.groups === null ? (
                                <div className={"d-flex justify-content-center"}>
                                    <Spinner animation="border" role="status">
                                        <span className="sr-only">Loading...</span>
                                    </Spinner>
                                </div>
                            ) : (
                                <ListGroup>
                                    {this.props.groups.length === 0 ? (
                                        <ListGroup.Item key={0}>
                                            <span>No Groups</span>
                                        </ListGroup.Item>
                                    ) : (
                                        this.props.groups.map((group, index) => {
                                            return (
                                                <ListGroup.Item
                                                    key={group.id}
                                                    className={"d-flex justify-content-between"}
                                                >
                                                    <div>
                                                        <span>
                                                            <Link to={"/groups/" + group.id}>{group.name}</Link>
                                                        </span>
                                                        <br />
                                                        <small className="text-muted">{group.description}</small>
                                                    </div>
                                                    <div>
                                                        <button
                                                            className="btn text-danger"
                                                            onClick={() => this.openGroupDeletionModal(group.id)}
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    </div>
                                                </ListGroup.Item>
                                            );
                                        })
                                    )}
                                </ListGroup>
                            )}
                        </Col>
                        <Col md={6} xs={12}>
                            <Button variant={"success"} onClick={this.openGroupCreationModal}>
                                New
                            </Button>
                        </Col>
                    </Row>
                    <Modal show={this.state.showGroupCreationModal} onHide={this.closeGroupCreationModal}>
                        <Modal.Header closeButton>
                            <Modal.Title>Create Group</Modal.Title>
                        </Modal.Header>

                        <Form onSubmit={this.onGroupSave}>
                            <Modal.Body>
                                <Form.Group controlId={"groupName"}>
                                    <Form.Label>Group name</Form.Label>
                                    <Form.Control
                                        type={"text"}
                                        name={"groupName"}
                                        onChange={this.onChange}
                                        value={this.state.groupName}
                                    />
                                </Form.Group>
                                <Form.Group controlId={"groupDescription"}>
                                    <Form.Label>Description</Form.Label>
                                    <Form.Control
                                        type={"text"}
                                        name={"groupDescription"}
                                        onChange={this.onChange}
                                        value={this.state.groupDescription}
                                    />
                                </Form.Group>
                            </Modal.Body>

                            <Modal.Footer>
                                <Button variant="success" type={"submit"}>
                                    Save
                                </Button>
                                <Button variant="outline-danger" onClick={this.closeGroupCreationModal}>
                                    Close
                                </Button>
                            </Modal.Footer>
                        </Form>
                    </Modal>
                    <Modal show={this.state.showGroupDeletionModal} onHide={this.closeGroupDeletionModal}>
                        <Modal.Header closeButton>
                            <Modal.Title>Delete Group?</Modal.Title>
                        </Modal.Header>

                        <Modal.Body>
                            {this.state.groupToDelete !== null ? (
                                <p>
                                    Are you sure you want to delete group{" "}
                                    {this.props.groups.find((item) => item.id === this.state.groupToDelete).name}
                                </p>
                            ) : (
                                ""
                            )}
                        </Modal.Body>

                        <Modal.Footer>
                            <Button variant="success" onClick={this.confirmDeleteGroup}>
                                Yes pls
                            </Button>
                            <Button variant="outline-danger" onClick={this.closeGroupDeletionModal}>
                                No
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </Col>
            </Row>
        );
    }
}

const mapStateToProps = (state) => ({
    status: state.users.status,
    error: state.users.error,
    groups: state.users.groups,
});

export default connect(mapStateToProps, { fetchGroups, createGroup, deleteGroup })(Groups);
