import React from "react";
import {toast} from "react-toastify";
import {Field, Form, Formik} from "formik";
import Dialog from "@material-ui/core/Dialog";
import Button from "@material-ui/core/Button";
import LinearProgress from "@material-ui/core/LinearProgress";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import {TextField} from "formik-material-ui";
import {createGroup} from "../../api";

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
                                component={TextField}
                                type="text"
                                name="name"
                                label="Group Name"
                            />
                            <Field
                                margin="normal"
                                required
                                fullWidth
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