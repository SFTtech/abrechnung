import React, {Component} from "react";
import {connect} from "react-redux";
import {withRouter} from "react-router-dom";

import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";

import ListGroup from "react-bootstrap/ListGroup";
import {createAccount, fetchAccounts} from "./accountsSlice";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faTrash} from "@fortawesome/free-solid-svg-icons";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/cjs/Button";


class Accounts extends Component {
    state = {
        showAccountCreationModal: false,
        accountName: "",
        accountDescription: "",
    };

    componentDidMount = () => {
        this.props.fetchAccounts({groupID: this.props.group.id});
    };

    onAccountSave = (e) => {
        e.preventDefault();
        this.props.createAccount({ groupID: this.props.group.id, name: this.state.accountName, description: this.state.accountDescription });
        this.setState({
            showAccountCreationModal: false,
            accountName: "",
            accountDescription: "",
        });
    };

    openAccountCreationModal = () => {
        this.setState({
            showAccountCreationModal: true,
        });
    };

    closeAccountCreationModal = () => {
        this.setState({ showAccountCreationModal: false });
    };

    onChange = (e) => {
        this.setState({ [e.target.name]: e.target.value });
    };

    render() {
        return (
            <Row>
                <Col xs={12}>
                    <Button variant={"success"} onClick={this.openAccountCreationModal}>
                        New
                    </Button>
                    <ListGroup>
                        {this.props.accountIDs.length === 0 ? (
                            <ListGroup.Item key={0}>
                                <span>No Accounts</span>
                            </ListGroup.Item>
                        ) : (
                            this.props.accountIDs.map(id => {
                                return (
                                    <ListGroup.Item
                                        key={id}
                                        className={"d-flex justify-content-between"}
                                    >
                                        <div>
                                            <span>{this.props.accounts[id].name}</span>
                                            <br/>
                                            <small className="text-muted">{this.props.accounts[id].description}</small>
                                        </div>
                                        <div>
                                            <button
                                                className="btn text-danger"
                                                onClick={() => this.openAccountDeletionModal(id)}
                                            >
                                                <FontAwesomeIcon icon={faTrash}/>
                                            </button>
                                        </div>
                                    </ListGroup.Item>
                                );
                            })
                        )}
                    </ListGroup>
                    <Modal show={this.state.showAccountCreationModal} onHide={this.closeAccountCreationModal}>
                        <Modal.Header closeButton>
                            <Modal.Title>Create Account</Modal.Title>
                        </Modal.Header>

                        <Form onSubmit={this.onAccountSave}>
                            <Modal.Body>
                                <Form.Group controlId={"accountName"}>
                                    <Form.Label>Account name</Form.Label>
                                    <Form.Control
                                        type={"text"}
                                        name={"accountName"}
                                        onChange={this.onChange}
                                        value={this.state.accountName}
                                    />
                                </Form.Group>
                                <Form.Group controlId={"accountDescription"}>
                                    <Form.Label>Description</Form.Label>
                                    <Form.Control
                                        type={"text"}
                                        name={"accountDescription"}
                                        onChange={this.onChange}
                                        value={this.state.accountDescription}
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
                </Col>
            </Row>
        );
    }
}

const mapStateToProps = (state) => ({
    status: state.transactions.status,
    error: state.transactions.error,
    accounts: state.accounts.entities,
    accountIDs: state.accounts.ids,
});

export default withRouter(connect(mapStateToProps, {fetchAccounts, createAccount})(Accounts));
