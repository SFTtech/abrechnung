import React from "react";
import {toast} from "react-toastify";
import {Field, Form, Formik} from "formik";
import {TextField} from "formik-mui";
import {createGroup} from "../../api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress } from "@mui/material";

export default function GroupCreateModal({show, onClose}) {

    const handleSubmit = (values, {setSubmitting}) => {
        createGroup({name: values.name, description: values.description})
            .then(result => {
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
            <DialogTitle>Create Group</DialogTitle>
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
                                type="text"
                                name="name"
                                label="Group Name"
                            />
                            <Field
                                margin="normal"
                                required
                                fullWidth
                                variant="standard"
                                component={TextField}
                                type="text"
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