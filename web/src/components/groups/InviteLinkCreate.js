import {Field, Form, Formik} from "formik";
import React from "react";
import {toast} from "react-toastify";
import {Checkbox, TextField} from "formik-material-ui";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import LinearProgress from "@material-ui/core/LinearProgress";
import {DateTimePicker} from "formik-material-ui-pickers";
import {FormControlLabel} from "@material-ui/core";
import {createGroupInvite} from "../../api";

export default function InviteLinkCreate({show, onClose, group}) {

    const handleSubmit = (values, {setSubmitting}) => {
        createGroupInvite({
            groupID: group.id,
            name: values.name,
            description: values.description,
            validUntil: values.validUntil,
            singleUse: values.singleUse,
        })
            .then(result => {
                toast.success("Successfully created invite token");
                setSubmitting(false);
                onClose();
            }).catch(err => {
            toast.error(`${err}`);
            setSubmitting(false);
        })
    };

    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Create Invite Link</DialogTitle>

            <DialogContent>
                <Formik initialValues={{description: "", validUntil: "", singleUse: false}} onSubmit={handleSubmit}>
                    {({values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting}) => (
                        <Form>
                            <Field
                                margin="normal"
                                required
                                fullWidth
                                autoFocus
                                component={TextField}
                                name="description"
                                label="Description"
                            />
                            <Field
                                margin="normal"
                                required
                                fullWidth
                                component={DateTimePicker}
                                name="validUntil"
                                label="Valid Until"
                            />
                            <FormControlLabel control={
                                <Field
                                    margin="normal"
                                    type="checkbox"
                                    component={Checkbox}
                                    name="singleUse"
                                />
                            } label={"Single Use"}/>

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
                        </Form>
                    )}
                </Formik>
            </DialogContent>
        </Dialog>
    )
}