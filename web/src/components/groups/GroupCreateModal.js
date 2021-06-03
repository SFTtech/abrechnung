import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/cjs/Button";
import React from "react";
import {sessionToken} from "../../recoil/auth";
import {toast} from "react-toastify";
import {Formik} from "formik";
import {createGroup, groupList} from "../../recoil/groups";
import {useRecoilValue, useSetRecoilState} from "recoil";

export default function GroupCreateModal({show, onClose}) {
    const token = useRecoilValue(sessionToken);
    const setGroupList = useSetRecoilState(groupList);

    const handleSubmit = (values, {setSubmitting}) => {
        createGroup({sessionToken: token, name: values.name, description: values.description})
            .then(result => {
                toast.success(`Created group ${values.name}`, {
                    position: "top-right",
                    autoClose: 5000,
                });
                // TODO: make this return the actual thingy
                setGroupList((oldGroupList) => [
                    ...oldGroupList,
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
                <Modal.Title>Create Group</Modal.Title>
            </Modal.Header>

            <Formik initialValues={{name: "", description: ""}} onSubmit={handleSubmit}>
                {({values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting}) => (
                    <form onSubmit={handleSubmit}>
                        <Modal.Body>
                            <Form.Group controlId={"name"}>
                                <Form.Label>Group name</Form.Label>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-control"
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    value={values.name}
                                />
                                {errors.name && touched.name && errors.name}
                            </Form.Group>
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
                                {errors.description && touched.description && errors.description}
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
                    </form>)}
            </Formik>
        </Modal>
    )
}