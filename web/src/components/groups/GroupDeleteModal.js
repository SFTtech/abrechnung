import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/cjs/Button";
import React from "react";

export default function GroupDeleteModal({show, onClose, groupToDelete}) {

    const deleteGroup = () => {

    }

    return (
        <Modal show={show} onHide={onClose}>
            <Modal.Header closeButton>
                <Modal.Title>Delete Group?</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {groupToDelete !== null ? (
                    <p>
                        Are you sure you want to delete group
                        {groupToDelete.name}
                    </p>
                ) : (
                    ""
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="success" onClick={deleteGroup}>
                    Yes pls
                </Button>
                <Button variant="outline-danger" onClick={onClose}>
                    No
                </Button>
            </Modal.Footer>
        </Modal>
    )
}