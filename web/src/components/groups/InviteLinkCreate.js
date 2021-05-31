import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import {Formik} from "formik";
import Datetime from "react-datetime";
import Button from "react-bootstrap/cjs/Button";
import React from "react";
import {createInviteToken, groupInviteTokens} from "../../recoil/groups";
import {toast} from "react-toastify";
import {useRecoilValue, useSetRecoilState} from "recoil";
import {sessionToken} from "../../recoil/auth";

export default function InviteLinkCreate({show, onClose, group}) {
    const token = useRecoilValue(sessionToken);
    const setInviteLinks = useSetRecoilState(groupInviteTokens(group.group_id));

    const handleSubmit = (values, {setSubmitting}) => {
        createInviteToken({
            sessionToken: token,
            groupID: group.group_id,
            name: values.name,
            description: values.description
        })
            .then(result => {
                toast.success(`Created group ${values.name}`, {
                    position: "top-right",
                    autoClose: 5000,
                });
                setInviteLinks((oldTokens) => [
                    ...oldTokens,
                    result
                ])
                setSubmitting(false);
                onClose();
            }).catch(err => {
            toast.error(`${err}`, {
                position: "top-right",
                autoClose: 5000,
            });
            setSubmitting(false);
        })
    };

    return (
        <Modal show={show} onHide={onClose}>
            <Modal.Header closeButton>
                <Modal.Title>Create Invite Link</Modal.Title>
            </Modal.Header>

            <Formik initialValues={{description: "", validUntil: ""}} onSubmit={handleSubmit}>
                {({values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting}) => (
                    <form onSubmit={handleSubmit}>
                        <Modal.Body>
                            <Form.Group controlId={"description"}>
                                <Form.Label>Description</Form.Label>
                                <input
                                    type="text"
                                    name="description"
                                    className="form-control"
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    value={values.description}
                                />
                            </Form.Group>
                            <Form.Group controlId={"validUntil"}>
                                <Form.Label>Valid Until</Form.Label>
                                <Datetime
                                    name="validUntil"
                                    onChange={(date) => handleChange({target: {value: date}})}
                                    value={values.validUntil}
                                />
                            </Form.Group>
                            <Form.Group controlId={"inviteLinkSingleUse"}>
                                <Form.Label>Single Use</Form.Label>
                                <Form.Check
                                    name={"singleUse"}
                                    onChange={handleChange}
                                    checked={values.singleUse}
                                />
                            </Form.Group>
                        </Modal.Body>

                        <Modal.Footer>
                            <Button variant="success" type={"submit"}>
                                {isSubmitting ? "Saving ..." : "Save"}
                            </Button>
                            <Button variant="outline-danger" onClick={onClose}>
                                Close
                            </Button>
                        </Modal.Footer>
                    </form>
                )}
            </Formik>
        </Modal>
    )
}