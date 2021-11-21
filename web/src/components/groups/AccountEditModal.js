import { Form, Formik } from "formik";
import React from "react";
import { toast } from "react-toastify";
import { updateAccount } from "../../api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, TextField } from "@mui/material";

export default function AccountEditModal({ group, show, onClose, account }) {

    const handleSubmit = (values, { setSubmitting }) => {
        updateAccount({
            groupID: group.id,
            accountID: values.accountID,
            name: values.name,
            description: values.description
        })
            .then(result => {
                toast.success(`Updated account ${values.name}`);
                setSubmitting(false);
                onClose();
            }).catch(err => {
            toast.error(err);
            setSubmitting(false);
        });
    };

    return (

        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogContent>
                <Formik initialValues={{
                    accountID: account?.id,
                    name: account?.name,
                    description: account?.description
                }} onSubmit={handleSubmit}
                        enableReinitialize={true}>
                    {({ values, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                        <Form>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                variant="standard"
                                autoFocus
                                name="name"
                                label="Account Name"
                                value={values.name}
                                onBlur={handleBlur}
                                onChange={handleChange}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                variant="standard"
                                name="description"
                                label="Description"
                                value={values.description}
                                onBlur={handleBlur}
                                onChange={handleChange}
                            />

                            {isSubmitting && <LinearProgress />}
                            <DialogActions>
                                <Button color="primary" type="submit" onClick={handleSubmit}>
                                    Save
                                </Button>
                                <Button color="secondary" onClick={onClose}>
                                    Close
                                </Button>
                            </DialogActions>

                        </Form>
                    )}
                </Formik>
            </DialogContent>
        </Dialog>
    );
}