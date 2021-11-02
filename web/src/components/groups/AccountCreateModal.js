import React from "react";
import {Field, Form, Formik} from "formik";
import {toast} from "react-toastify";
import {TextField} from "formik-mui";
import {createAccount} from "../../api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress } from "@mui/material";

export default function AccountCreateModal({show, onClose, group}) {
    const handleSubmit = (values, {setSubmitting}) => {
        createAccount({
            groupID: group.id,
            name: values.name,
            description: values.description
        })
            .then(result => {
                toast.success(`Created account ${values.name}`);
                setSubmitting(false);
                onClose();
            })
            .catch(err => {
                toast.error(err);
                setSubmitting(false);
            })
    };
    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Create Account</DialogTitle>

            <DialogContent>
                <Formik initialValues={{name: "", description: ""}} onSubmit={handleSubmit}>
                    {({handleSubmit, isSubmitting}) => (
                        <Form>
                            <Field
                                margin="normal"
                                required
                                fullWidth
                                autoFocus
                                variant="standard"
                                component={TextField}
                                name="name"
                                label="Account Name"
                            />
                            <Field
                                margin="normal"
                                required
                                fullWidth
                                variant="standard"
                                component={TextField}
                                name="description"
                                label="Description"
                            />

                            {isSubmitting && <LinearProgress/>}
                            <DialogActions>
                                <Button color="secondary" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    color="primary"
                                    disabled={isSubmitting}
                                    onClick={handleSubmit}
                                >
                                    Save
                                </Button>
                            </DialogActions>
                        </Form>)}
                </Formik>
            </DialogContent>
        </Dialog>
    )
}