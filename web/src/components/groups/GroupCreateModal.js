import React from "react";
import { toast } from "react-toastify";
import { Form, Formik } from "formik";
import { createGroup } from "../../api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, TextField } from "@mui/material";
import * as yup from "yup";

const validationSchema = yup.object({
    name: yup.string("Enter an account name").required("Name is required"),
    description: yup.string("Enter an account description"),
})

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
                <Formik initialValues={{ name: "", description: "" }} onSubmit={handleSubmit} validationSchema={validationSchema}>
                    {({ values, touched, errors, handleBlur, handleChange, handleSubmit, isSubmitting }) => (
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
                                error={touched.name && Boolean(errors.name)}
                                helperText={touched.name && errors.name}
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
                                error={touched.description && Boolean(errors.description)}
                                helperText={touched.description && errors.description}
                            />
                            {isSubmitting && <LinearProgress />}
                            <DialogActions>
                                <Button color="error" onClick={onClose}>
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