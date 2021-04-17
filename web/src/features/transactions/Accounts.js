import React, {Component} from "react";
import {connect} from "react-redux";
import {withRouter} from "react-router-dom";

import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";

import ListGroup from "react-bootstrap/ListGroup";
import {createAccount, fetchAccounts} from "../../store/groupsSlice";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faTrash} from "@fortawesome/free-solid-svg-icons";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/cjs/Button";
import {faPencilAlt} from "@fortawesome/free-solid-svg-icons/faPencilAlt";
import {faPlus} from "@fortawesome/free-solid-svg-icons/faPlus";
import PropTypes from "prop-types";
import Spinner from "react-bootstrap/Spinner";


class Accounts extends Component {
    static propTypes = {
        group: PropTypes.object.isRequired,
    };

    state = {
        showAccountCreationModal: false,
        accountName: "",
        accountDescription: "",
    };

    componentDidMount = () => {
        this.props.fetchAccounts({groupID: this.props.group.group_id});
    };

    onAccountSave = (e) => {
        e.preventDefault();
        this.props.createAccount({
            groupID: this.props.group.group_id,
            name: this.state.accountName,
            description: this.state.accountDescription
        });
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
        this.setState({showAccountCreationModal: false});
    };

    onChange = (e) => {
        this.setState({[e.target.name]: e.target.value});
    };

    render() {
        if (this.props.group.accounts === undefined) {
            return (
                <Row>
                    <Col xs={12}>
                        <div className={"d-flex justify-content-center"}>
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        </div>
                    </Col>
                </Row>
            )
        }

        return (
            <Row>
                <Col xs={12}>
                    <ListGroup variant={"flush"}>
                        {this.props.group.accounts.length === 0 ? (
                            <ListGroup.Item key={0}>
                                <span>No Accounts</span>
                            </ListGroup.Item>
                        ) : (
                            this.props.group.accounts.map(account => {
                                return (
                                    <ListGroup.Item
                                        key={account.id}
                                        className={"d-flex justify-content-between"}
                                    >
                                        <div>
                                            <span>{account.name}</span>
                                            <br/>
                                            <small className="text-muted">{account.description}</small>
                                        </div>
                                        <div>
                                            <button
                                                className="btn text-info"
                                                onClick={() => this.openEditAccountModal(account.id)}
                                            >
                                                <FontAwesomeIcon icon={faPencilAlt}/>
                                            </button>
                                            <button
                                                className="btn text-danger"
                                                onClick={() => this.openRemoveAccountModal(account.id)}
                                            >
                                                <FontAwesomeIcon icon={faTrash}/>
                                            </button>
                                        </div>
                                    </ListGroup.Item>
                                );
                            })
                        )}
                    </ListGroup>
                    <div className={"d-flex justify-content-center"}>
                        <Button variant={"outline-success"} onClick={this.openAccountCreationModal}><FontAwesomeIcon
                            icon={faPlus}/></Button>
                    </div>
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
                                <Button variant="outline-danger" onClick={this.closeAccountCreationModal}>
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

export default withRouter(connect(null, {fetchAccounts, createAccount})(Accounts));
