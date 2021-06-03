import React, {useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCheck, faPencilAlt, faTimes, faTrash} from "@fortawesome/free-solid-svg-icons";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import {useRecoilValue, useResetRecoilState} from "recoil";
import {deleteSession, renameSession, sessionToken, userSessions} from "../../recoil/auth";

export default function SessionList() {
    // TODO: fix editing functions
    let [editedSessions, setEditedSessions] = useState({});
    let [sessionToDelete, setSessionToDelete] = useState({show: false, toDelete: null});
    const sessions = useRecoilValue(userSessions);
    const authtoken = useRecoilValue(sessionToken);
    const reloadSessions = useResetRecoilState(userSessions);

    const editSession = (id) => {
        if (!editedSessions.hasOwnProperty(id)) {
            const newSessions = {...editedSessions, [id]: sessions.find(session => session.session_id === id)?.name};
            setEditedSessions(newSessions);
        }
    };

    const stopEditSession = (id) => {
        if (editedSessions.hasOwnProperty(id)) {
            let newEditedSessions = {...editedSessions};
            delete newEditedSessions[id];
            setEditedSessions(newEditedSessions);
        }
    };

    const closeDeleteSessionModal = () => {
        setSessionToDelete({show: false, toDelete: null});
    };

    const performRename = (id) => {
        if (editedSessions.hasOwnProperty(id)) {
            renameSession({
                authtoken: authtoken,
                sessionID: id,
                newName: editedSessions[id],
            }).then(result => {
                reloadSessions();
            })
            stopEditSession(id);
        }
    };

    const openDeleteSessionModal = (id) => {
        setSessionToDelete({show: true, toDelete: id});
    };

    const confirmDeleteSession = () => {
        if (sessionToDelete.toDelete !== null) {
            deleteSession({authtoken: authtoken, sessionID: sessionToDelete.toDelete})
                .then(result => {
                    reloadSessions();
                });
            setSessionToDelete({show: false, toDelete: null});
        }
    };

    const handleEditChange = (id, value) => {
        const newEditedSessions = {...editedSessions, [id]: value};
        setEditedSessions(newEditedSessions);
    };

    return (
        <>
            <div className={"list-group"}>
                {sessions.map((session) => {
                    if (editedSessions.hasOwnProperty(session.session_id)) {
                        return (
                            <div key={session.session_id} className="list-group-item d-flex justify-content-between">
                                <div>
                                    <input
                                        type="text"
                                        value={editedSessions[session.session_id]}
                                        onChange={(event) => handleEditChange(session.session_id, event.target.value)}
                                    />
                                    <br/>
                                    <small className="text-muted">Last seen: {session.last_seen}</small>
                                </div>
                                <div>
                                    <button className="btn text-success"
                                            onClick={() => performRename(session.session_id)}>
                                        <FontAwesomeIcon icon={faCheck}/>
                                    </button>
                                    <button className="btn text-danger"
                                            onClick={() => stopEditSession(session.session_id)}>
                                        <FontAwesomeIcon icon={faTimes}/>
                                    </button>
                                </div>
                            </div>
                        );
                    } else {
                        return (
                            <div key={session.session_id} className="list-group-item d-flex justify-content-between">
                                <div>
                                    <span>{session.name}</span>
                                    <br/>
                                    <small className="text-muted">Last seen: {session.last_seen}</small>
                                </div>
                                <div>
                                    <button className="btn text-info" onClick={() => editSession(session.session_id)}>
                                        <FontAwesomeIcon icon={faPencilAlt}/>
                                    </button>
                                    <button className="btn text-danger"
                                            onClick={() => openDeleteSessionModal(session.session_id)}>
                                        <FontAwesomeIcon icon={faTrash}/>
                                    </button>
                                </div>
                            </div>
                        );
                    }
                })}
            </div>
            <Modal show={sessionToDelete.show} onHide={closeDeleteSessionModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Delete Session?</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    {sessionToDelete.toDelete !== null ? (
                        <p>
                            Are you sure you want to delete session{" "}
                            {sessions.find(session => session.session_id === sessionToDelete.toDelete)?.name}
                        </p>
                    ) : (
                        ""
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="success" onClick={confirmDeleteSession}>
                        Yes pls
                    </Button>
                    <Button variant="outline-danger" onClick={closeDeleteSessionModal}>
                        No
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}
