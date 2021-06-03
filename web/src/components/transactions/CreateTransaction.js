import React from "react";
import {useHistory} from "react-router-dom";
import Col from "react-bootstrap/cjs/Col";
import Button from "react-bootstrap/cjs/Button";
import Form from "react-bootstrap/cjs/Form";
import Row from "react-bootstrap/Row";
import {toast} from "react-toastify";
import {useRecoilValue, useResetRecoilState} from "recoil";
import {sessionToken} from "../../recoil/auth";
import {createTransaction, groupTransactions} from "../../recoil/transactions";
import {Formik} from "formik";
import Modal from "react-bootstrap/Modal";


export default function CreateTransaction({group}) {
    const reloadTransactions = useResetRecoilState(groupTransactions({groupID: group.group_id}));
    const token = useRecoilValue(sessionToken);
    const history = useHistory();

    const handleSubmit = (values, {setSubmitting}) => {
        createTransaction({
            sessionToken: token,
            groupID: group.group_id,
            type: values.type,
            description: values.description,
            value: values.value,
            currencySymbol: "€",
            currencyConversionRate: 1.0
        })
            .then(result => {
                toast.success(`Created transaction`, {
                    position: "top-right",
                    autoClose: 5000,
                });
                // TODO: make this return the actual thingy
                setSubmitting(false);
                reloadTransactions();
                // TODO: use useRecoilCallback to wait for a reload
                // TODO: set timeout on if loadable to redirect
                history.push(`/groups/${group.group_id}/transactions/${result.transaction_id}`)
            }).catch(err => {
            toast.error(`${err}`, {
                position: "top-right",
                autoClose: 5000,
            });
            setSubmitting(false);
        })
    };

    return (
        <>
            <Row>
                <Col xs={12}>
                    <Formik initialValues={{type: "purchase", description: "", value: "0.0"}} onSubmit={handleSubmit}>
                        {({values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting}) => (
                            <form onSubmit={handleSubmit}>
                                <Modal.Body>
                                    <Form.Group controlId={"type"}>
                                        <Form.Label>Type</Form.Label>
                                        <select
                                            name="type"
                                            className="form-control"
                                            onBlur={handleBlur}
                                            onChange={handleChange}
                                            value={values.type}>
                                            <option>purchase</option>
                                            <option>transfer</option>
                                            <option>mimo</option>
                                        </select>
                                        {errors.type && touched.type && errors.type}
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
                                    <Form.Group controlId={"value"}>
                                        <Form.Label>Amount</Form.Label>
                                        <input
                                            type="number"
                                            name="value"
                                            className="form-control"
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            value={values.value}
                                        />
                                        {errors.value && touched.value && errors.value}
                                    </Form.Group>
                                </Modal.Body>

                                <Modal.Footer>
                                    <Button variant="success" type={"submit"}>
                                        {isSubmitting ? "Saving ..." : "Save"}
                                    </Button>
                                </Modal.Footer>
                            </form>)}
                    </Formik>
                </Col>
            </Row>
        </>
    );
}
