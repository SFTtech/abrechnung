import React, {Component} from "react";
import {connect} from "react-redux";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";
import Button from "react-bootstrap/cjs/Button";
import Modal from "react-bootstrap/Modal";
import Form from 'react-bootstrap/Form';

class Groups extends Component {
    state = {
        showGroupCreationModal: false,
    };

    onGroupSave = (e) => {
        e.preventDefault();
    }

    openGroupCreationModal = () => {
        this.setState({showGroupCreationModal: true});
    }

    closeGroupCreationModal = () => {
        this.setState({showGroupCreationModal: false});
    }

    render() {
        const error = this.props.error !== null ? <div className="alert alert-danger">{this.props.error}</div> : "";
        let groups = this.props.groups.map((group, index) => {
            return (
                <ListGroup.Item key={group.id}>{group.name}</ListGroup.Item>
            );
        });
        return (
            <>
                <div className="row mt-5">
                    <div className="col-12">
                        <h4>Groups</h4>
                        {error}
                        <Row>
                            <Col md={6} xs={12}>
                                <ListGroup variant={"flush"}>{groups}</ListGroup>
                            </Col>
                            <Col md={6} xs={12}>
                                <Button variant={"success"} onClick={this.openGroupCreationModal}>New</Button>
                            </Col>
                        </Row>
                    </div>
                </div>
                <Modal show={this.state.showGroupCreationModal} onHide={this.closeGroupCreationModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Create Group</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        <Form onSubmit={this.onGroupSave}>
                            <Form.Group controlId={"name"}>
                                <Form.Label>Group name</Form.Label>
                                <Form.Control type={"text"}/>
                            </Form.Group>
                            <Form.Group controlId={"description"}>
                                <Form.Label>Description</Form.Label>
                                <Form.Control type={"text"}/>
                            </Form.Group>
                        </Form>
                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="success" onClick={this.confirmDeleteSession}>Save</Button>
                        <Button variant="outline-danger" onClick={this.closeGroupCreationModal}>Close</Button>
                    </Modal.Footer>
                </Modal>
            </>
        );
    }
}

const mapStateToProps = (state) => ({
    status: state.users.status,
    error: state.users.error,
    users: state.users.users,
    groups: state.users.groups,
});

export default connect(mapStateToProps)(Groups);
