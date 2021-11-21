import React from "react";
import { toast } from "react-toastify";
import { Form, Formik } from "formik";
import { createGroup } from "../../api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, TextField } from "@mui/material";

export default function GroupCreateModal({ show, onClose }) {

    const handleSubmit = (values, { setSubmitting }) => {
        createGroup({ name: values.name, description: values.description })
            .then(result => {
                setSubmitting(false);
                onClose();
            })
            .catch(err => {
                toast.error(err);
                setSubmitting(false);
            });
    };

    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Create Group</DialogTitle>
            <DialogContent>
                <Formik initialValues={{ name: "", description: "" }} onSubmit={handleSubmit}>
                    {({ values, handleBlur, handleChange, handleSubmit, isSubmitting }) => (
                        <Form>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                autoFocus
                                variant="standard"
                                type="text"
                                name="name"
                                label="Group Name"
                                value={values.name}
                                onBlur={handleBlur}
                                onChange={handleChange}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                variant="standard"
                                type="text"
                                name="description"
                                label="Description"
                                value={values.description}
                                onBlur={handleBlur}
                                onChange={handleChange}
                            />
                            {isSubmitting && <LinearProgress />}
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
    );
}