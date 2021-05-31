import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/cjs/Button";
import React from "react";
import {Formik} from "formik";
import {createAccount, groupAccounts} from "../../recoil/groups";
import {toast} from "react-toastify";
import {useRecoilValue, useSetRecoilState} from "recoil";
import {sessionToken} from "../../recoil/auth";

export default function AccountCreateModal({show, onClose, group}) {
    const token = useRecoilValue(sessionToken);
    const setAccounts = useSetRecoilState(groupAccounts(group.group_id));

    const handleSubmit = (values, {setSubmitting}) => {
        createAccount({
            sessionToken: token,
            groupID: group.group_id,
            name: values.name,
            description: values.description
        })
            .then(result => {
                toast.success(`Created account ${values.name}`, {
                    position: "top-right",
                    autoClose: 5000,
                });
                setAccounts((oldAccounts) => [
                    ...oldAccounts,
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
                <Modal.Title>Create Account</Modal.Title>
            </Modal.Header>

            <Formik initialValues={{name: "", description: ""}} onSubmit={handleSubmit}>
                {({values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting}) => (
                    <form onSubmit={handleSubmit}>
                        <Modal.Body>
                            <Form.Group controlId="name">
                                <Form.Label>Account name</Form.Label>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-control"
                                    onBlur={handleBlur}
                                    onChange={handleChange}
                                    value={values.name}
                                />
                                {errors.name && touched.name && errors.name}
                            </Form.Group>
                            <Form.Group controlId="description">
                                <Form.Label>Description</Form.Label>
                                <input
                                    type="text"
                                    name="description"
                                    className="form-control"
                                    onBlur={handleBlur}
                                    onChange={handleChange}
                                    value={values.description}
                                />
                                {errors.description && touched.description && errors.description}
                            </Form.Group>
                        </Modal.Body>

                        <Modal.Footer>
                            <Button variant="success" type="submit">
                                {isSubmitting ? "Saving ..." : "Save"}
                            </Button>
                            <Button variant="outline-danger" onClick={onClose}>
                                Close
                            </Button>
                        </Modal.Footer>
                    </form>)}
            </Formik>
        </Modal>
    )
}