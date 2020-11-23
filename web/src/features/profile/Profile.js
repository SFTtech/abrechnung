import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {Accordion, Button, Card, Modal, Row, Spinner} from "react-bootstrap";
import {fetchUserInfo} from "../auth/authSlice";
import {deleteSession, fetchSessionInfo, renameSession} from "./profileSlice";
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faCheck, faPencilAlt, faTimes, faTrash} from '@fortawesome/free-solid-svg-icons'
import ChangePassword from "./ChangePassword";
import './Profile.css';
import ChangeEmail from "./ChangeEmail";

class Profile extends Component {
    static propTypes = {
        user: PropTypes.object,
        sessions: PropTypes.any,
        error: PropTypes.object,
        isLoading: PropTypes.bool.isRequired,
        fetchUserInfo: PropTypes.func.isRequired,
        renameSession: PropTypes.func.isRequired,
        deleteSession: PropTypes.func.isRequired,
    };
    state = {
        editedSessions: {},
        deleteSession: {
            show: false,
            toDelete: null
        },
    }

    editSession = (index) => {
        if (!this.state.editedSessions.hasOwnProperty(index)) {
            const editedSessions = {...this.state.editedSessions, [index]: this.props.sessions[index].name};
            this.setState({editedSessions: editedSessions});
        }
    }

    stopEditSession = (index) => {
        if (this.state.editedSessions.hasOwnProperty(index)) {
            let editedSessions = {...this.state.editedSessions};
            delete editedSessions[index];
            this.setState({editedSessions: editedSessions});
        }
    }

    closeDeleteSessionModal = () => {
        this.setState({deleteSession: {show: false, toDelete: null}});
    }

    renameSession = (index) => {
        if (this.state.editedSessions.hasOwnProperty(index)) {
            this.props.renameSession({
                session: this.props.sessions[index].id,
                new_name: this.state.editedSessions[index]
            })
            this.stopEditSession(index);
        }
    }

    openDeleteSessionModal = (index) => {
        this.setState({deleteSession: {show: true, toDelete: index}});
    }

    confirmDeleteSession = () => {
        if (this.state.deleteSession.toDelete !== null) {
            this.props.deleteSession({session: this.props.sessions[this.state.deleteSession.toDelete].id});
            this.setState({deleteSession: {show: false, toDelete: null}});
        }
    }

    handleEditChange = (index, value) => {
        const editedSessions = {...this.state.editedSessions, [index]: value};
        this.setState({editedSessions: editedSessions});
    }

    componentDidMount = () => {
        if (this.props.user === null) {
            this.props.fetchUserInfo();
        }
        if (this.props.sessions === null) {
            this.props.fetchSessionInfo();
        }
    }

    render() {
        const error = this.props.error !== null ? <div className="alert alert-danger">{this.props.error}</div> : "";
        if (this.props.isLoading) {
            return (
                <div className="row">
                    <div className="col-md-10 m-auto">
                        <div className="card card-body mt-5">
                            <h3 className="text-center">Profile</h3>
                            {error}
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        </div>
                    </div>
                </div>
            );
        }

        let sessions = "";
        if (this.props.sessions !== null) {
            sessions = this.props.sessions.map((session, index) => {
                if (this.state.editedSessions.hasOwnProperty(index)) {
                    return (
                        <li key={session.id} className="list-group-item d-flex justify-content-between">
                            <div>
                                <input type="text" value={this.state.editedSessions[index]}
                                       onChange={(event) => this.handleEditChange(index, event.target.value)}/><br/>
                                <small className="text-muted">Last seen: {session.last_seen}</small>
                            </div>
                            <div>
                                <button className="btn text-success" onClick={() => this.renameSession(index)}>
                                    <FontAwesomeIcon icon={faCheck}/>
                                </button>
                                <button className="btn text-danger" onClick={() => this.stopEditSession(index)}>
                                    <FontAwesomeIcon icon={faTimes}/>
                                </button>
                            </div>
                        </li>
                    );
                } else {
                    return (
                        <li key={session.id} className="list-group-item d-flex justify-content-between">
                            <div>
                                <span>{session.name}</span><br/>
                                <small className="text-muted">Last seen: {session.last_seen}</small>
                            </div>
                            <div>
                                <button className="btn text-info" onClick={() => this.editSession(index)}>
                                    <FontAwesomeIcon icon={faPencilAlt}/>
                                </button>
                                <button className="btn text-danger" onClick={() => this.openDeleteSessionModal(index)}>
                                    <FontAwesomeIcon icon={faTrash}/>
                                </button>
                            </div>
                        </li>
                    );
                }
            });
        }

        return (
            <Row>
                <div className="col-md-10 m-auto">
                    <div className="card card-body mt-5">
                        <h3 className="text-center">Profile</h3>
                        {error}
                        <hr/>
                        <Accordion>
                            <Card>
                                <Card.Header>
                                    <Accordion.Toggle as={Button} variant={"link"} eventKey={"0"}>
                                        Change Password
                                    </Accordion.Toggle>
                                </Card.Header>
                                <Accordion.Collapse eventKey={"0"}>
                                    <Card.Body>
                                        <ChangePassword/>
                                    </Card.Body>
                                </Accordion.Collapse>
                            </Card>
                        </Accordion>
                        <Accordion>
                            <Card>
                                <Card.Header>
                                    <Accordion.Toggle as={Button} variant={"link"} eventKey={"1"}>
                                        Change Email
                                    </Accordion.Toggle>
                                </Card.Header>
                                <Accordion.Collapse eventKey={"1"}>
                                    <Card.Body>
                                        <ChangeEmail/>
                                    </Card.Body>
                                </Accordion.Collapse>
                            </Card>
                        </Accordion>
                        <div className={"mt-3"}>
                            <h4>Sessions</h4>
                            <ul className="list-group session-list">{sessions}</ul>
                        </div>
                    </div>
                </div>
                <Modal show={this.state.deleteSession.show} onHide={this.closeDeleteSessionModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Delete Session?</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        {this.state.deleteSession.toDelete !== null ? (
                            <p>Are you sure you want to delete
                                session {this.props.sessions[this.state.deleteSession.toDelete].name}</p>
                        ) : ""}
                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="success" onClick={this.confirmDeleteSession}>Yes pls</Button>
                        <Button variant="outline-danger" onClick={this.closeDeleteSessionModal}>No</Button>
                    </Modal.Footer>
                </Modal>
            </Row>
        );
    }
}

const mapStateToProps = (state) => ({
    user: state.auth.user,
    error: state.profile.error,
    sessions: state.profile.sessions,
    isLoading: state.profile.status === 'loading'
});

export default connect(mapStateToProps, {fetchUserInfo, fetchSessionInfo, deleteSession, renameSession})(Profile);
