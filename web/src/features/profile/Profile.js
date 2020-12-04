import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {withRouter} from "react-router-dom";
import {fetchUserInfo} from "../auth/authSlice";
import {deleteSession, fetchSessionInfo, renameSession} from "./profileSlice";
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faCheck, faPencilAlt, faTimes, faTrash} from '@fortawesome/free-solid-svg-icons'
import ChangePassword from "./ChangePassword";
import ChangeEmail from "./ChangeEmail";
import Spinner from "react-bootstrap/Spinner";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Col from "react-bootstrap/Col";
import Tab from "react-bootstrap/Tab";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import {LinkContainer} from "react-router-bootstrap";

import './Profile.css';

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
            <Row className={"mt-4"}>
                <Col xs={12}>
                    <h3>Profile</h3>
                    {error}
                    <hr/>
                    <Tab.Container id="profile-tabs" defaultActiveKey="user-info"
                                   activeKey={this.props.match.params !== undefined ? this.props.match.params.tab : "user-info"}>
                        <Row>
                            <Col lg={3} md={4}>
                                <ListGroup>
                                    <LinkContainer to={"/profile/user-info"}>
                                        <ListGroup.Item action>User Info</ListGroup.Item>
                                    </LinkContainer>
                                    <LinkContainer to={"/profile/sessions"}>
                                        <ListGroup.Item action>Sessions</ListGroup.Item>
                                    </LinkContainer>
                                    <LinkContainer to={"/profile/change-email"}>
                                        <ListGroup.Item action>Change E-Mail</ListGroup.Item>
                                    </LinkContainer>
                                    <LinkContainer to={"/profile/change-password"}>
                                        <ListGroup.Item action>Change Password</ListGroup.Item>
                                    </LinkContainer>
                                </ListGroup>
                            </Col>
                            <Col lg={9} md={8}>
                                <Tab.Content>
                                    <Tab.Pane eventKey="user-info">
                                        {this.props.isLoading || this.props.user === null ? (
                                            <div className={"d-flex justify-content-center"}>
                                                <Spinner animation="border" role="status">
                                                    <span className="sr-only">Loading...</span>
                                                </Spinner>
                                            </div>
                                        ) : (
                                            <ListGroup variant={"flush"}>
                                                <ListGroup.Item className={"d-flex"}>
                                                    <span className={"font-weight-bold w-25"}>Username</span>
                                                    <span>{this.props.user.username}</span>
                                                </ListGroup.Item>
                                                <ListGroup.Item className={"d-flex"}>
                                                    <span className={"font-weight-bold w-25"}>E-Mail</span>
                                                    <span>{this.props.user.email}</span>
                                                </ListGroup.Item>
                                                <ListGroup.Item className={"d-flex"}>
                                                    <span className={"font-weight-bold w-25"}>Language</span>
                                                    <span>{this.props.user.language}</span>
                                                </ListGroup.Item>
                                                <ListGroup.Item className={"d-flex"}>
                                                    <span className={"font-weight-bold w-25"}>Registered</span>
                                                    <span>{this.props.user.registered_at}</span>
                                                </ListGroup.Item>
                                            </ListGroup>
                                        )}
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="sessions">
                                        {this.props.isLoading || this.props.sessions === null ? (
                                            <div className={"d-flex justify-content-center"}>
                                                <Spinner animation="border" role="status">
                                                    <span className="sr-only">Loading...</span>
                                                </Spinner>
                                            </div>
                                        ) : (
                                            sessions
                                        )}
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="change-email">
                                        <ChangeEmail/>
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="change-password">
                                        <ChangePassword/>
                                    </Tab.Pane>
                                </Tab.Content>
                            </Col>
                        </Row>
                    </Tab.Container>
                </Col>
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

export default withRouter(connect(mapStateToProps, {
    fetchUserInfo,
    fetchSessionInfo,
    deleteSession,
    renameSession
})(Profile));
