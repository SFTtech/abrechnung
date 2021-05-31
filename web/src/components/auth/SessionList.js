import React, {useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCheck, faPencilAlt, faTimes, faTrash} from "@fortawesome/free-solid-svg-icons";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import {useRecoilValue} from "recoil";
import {userSessions} from "../../recoil/auth";

export default function SessionList() {
    // TODO: fix editing functions
    let [editedSessions, setEditedSessions] = useState({});
    let [deleteSession, setDeleteSession] = useState({show: false, toDelete: null});
    const sessions = useRecoilValue(userSessions);

    const editSession = (index) => {
        if (!editedSessions.hasOwnProperty(index)) {
            const editedSessions = {...editedSessions, [index]: sessions[index].name};
            setEditedSessions({editedSessions: editedSessions});
        }
    };

    const stopEditSession = (index) => {
        if (editedSessions.hasOwnProperty(index)) {
            let newEditedSessions = {...editedSessions};
            delete newEditedSessions[index];
            setEditedSessions({editedSessions: newEditedSessions});
        }
    };

    const closeDeleteSessionModal = () => {
        setDeleteSession({show: false, toDelete: null});
    };

    const renameSession = (index) => {
        if (editedSessions.hasOwnProperty(index)) {
            renameSession({
                session: sessions[index].id,
                new_name: editedSessions[index],
            });
            stopEditSession(index);
        }
    };

    const openDeleteSessionModal = (index) => {
        setDeleteSession({show: true, toDelete: index});
    };

    const confirmDeleteSession = () => {
        if (deleteSession.toDelete !== null) {
            deleteSession({session: this.props.sessions[this.state.deleteSession.toDelete].id});
            setDeleteSession({show: false, toDelete: null});
        }
    };

    const handleEditChange = (index, value) => {
        const newEditedSessions = {...editedSessions, [index]: value};
        setEditedSessions({editedSessions: newEditedSessions});
    };

    const modal = (
        <Modal show={deleteSession.show} onHide={closeDeleteSessionModal}>
            <Modal.Header closeButton>
                <Modal.Title>Delete Session?</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {deleteSession.toDelete !== null ? (
                    <p>
                        Are you sure you want to delete session{" "}
                        {sessions[deleteSession.toDelete].name}
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
    );
    const sessionsDisplay = sessions.map((session, index) => {
        if (editedSessions.hasOwnProperty(index)) {
            return (
                <div key={session.id} className="list-group-item d-flex justify-content-between">
                    <div>
                        <input
                            type="text"
                            value={this.state.editedSessions[index]}
                            onChange={(event) => this.handleEditChange(index, event.target.value)}
                        />
                        <br/>
                        <small className="text-muted">Last seen: {session.last_seen}</small>
                    </div>
                    <div>
                        <button className="btn text-success" onClick={() => renameSession(index)}>
                            <FontAwesomeIcon icon={faCheck}/>
                        </button>
                        <button className="btn text-danger" onClick={() => stopEditSession(index)}>
                            <FontAwesomeIcon icon={faTimes}/>
                        </button>
                    </div>
                </div>
            );
        } else {
            return (
                <div key={session.id} className="list-group-item d-flex justify-content-between">
                    <div>
                        <span>{session.name}</span>
                        <br/>
                        <small className="text-muted">Last seen: {session.last_seen}</small>
                    </div>
                    <div>
                        <button className="btn text-info" onClick={() => editSession(index)}>
                            <FontAwesomeIcon icon={faPencilAlt}/>
                        </button>
                        <button className="btn text-danger" onClick={() => openDeleteSessionModal(index)}>
                            <FontAwesomeIcon icon={faTrash}/>
                        </button>
                    </div>
                </div>
            );
        }
    });

    return (
        <>
            <div className={"list-group"}>{sessionsDisplay}</div>
            {modal}
        </>
    );
}
