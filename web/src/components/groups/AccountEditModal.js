import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import {Field, Form, Formik} from "formik";
import {TextField} from "formik-material-ui";
import LinearProgress from "@material-ui/core/LinearProgress";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";
import React from "react";
import {toast} from "react-toastify";
import {updateAccount} from "../../api";

export default function AccountEditModal({group, show, onClose, account}) {

    const handleSubmit = (values, {setSubmitting}) => {
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
        })
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
                    {({handleSubmit, isSubmitting}) => (
                        <Form>
                            <Field
                                margin="normal"
                                required
                                fullWidth
                                autoFocus
                                component={TextField}
                                name="name"
                                label="Account Name"
                            />
                            <Field
                                margin="normal"
                                required
                                fullWidth
                                component={TextField}
                                name="description"
                                label="Description"
                            />

                            {isSubmitting && <LinearProgress/>}
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
    )
}