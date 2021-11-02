import { Field, Form, Formik } from "formik";
import React from "react";
import { toast } from "react-toastify";
import { createGroupInvite } from "../../api";
import { DateTime } from "luxon";
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    LinearProgress,
    TextField
} from "@mui/material";
import { DateTimePicker } from "@mui/lab";

export default function InviteLinkCreate({ show, onClose, group }) {

    const handleSubmit = (values, { setSubmitting }) => {
        createGroupInvite({
            groupID: group.id,
            name: values.name,
            description: values.description,
            validUntil: values.validUntil,
            singleUse: values.singleUse
        })
            .then(result => {
                toast.success("Successfully created invite token");
                setSubmitting(false);
                onClose();
            }).catch(err => {
            toast.error(err);
            setSubmitting(false);
        });
    };

    const nowPlusOneHour = () => {
        return DateTime.now().plus({ hours: 1 });
    };

    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Create Invite Link</DialogTitle>

            <DialogContent>
                <Formik initialValues={{ description: "", validUntil: nowPlusOneHour(), singleUse: false }}
                        onSubmit={handleSubmit}>
                    {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                        <Form>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                autoFocus
                                variant="standard"
                                name="description"
                                label="Description"
                                value={values.description}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                            <DateTimePicker
                                margin="normal"
                                label="Valid until"
                                value={values.validUntil}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                renderInput={(props) => <TextField variant="standard" fullWidth {...props} />}
                            />
                            <FormControlLabel control={
                                <Checkbox
                                    margin="normal"
                                    type="checkbox"
                                    variant="standard"
                                    name="singleUse"
                                    value={values.singleUse}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                />
                            } label={"Single Use"} />

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
                        </Form>
                    )}
                </Formik>
            </DialogContent>
        </Dialog>
    );
}