import { Form, Formik } from "formik";
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
    TextField,
} from "@mui/material";
import { DateTimePicker } from "@mui/lab";

export default function InviteLinkCreate({ show, onClose, group }) {
    const handleSubmit = (values, { setSubmitting }) => {
        createGroupInvite({
            groupID: group.id,
            name: values.name,
            description: values.description,
            validUntil: values.validUntil,
            singleUse: values.singleUse,
            joinAsEditor: values.joinAsEditor,
        })
            .then((result) => {
                toast.success("Successfully created invite token");
                setSubmitting(false);
                onClose();
            })
            .catch((err) => {
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
                <Formik
                    initialValues={{
                        description: "",
                        validUntil: nowPlusOneHour(),
                        singleUse: false,
                        joinAsEditor: false,
                    }}
                    onSubmit={handleSubmit}
                >
                    {({ values, setFieldValue, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
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
                                required
                                fullWidth
                                variant="standard"
                                name="validUntil"
                                inputFormat="yyyy-MM-dd HH:mm"
                                value={values.validUntil}
                                onChange={(val) => setFieldValue("validUntil", val, true)}
                                onBlur={handleBlur}
                                renderInput={(props) => (
                                    <TextField sx={{ marginTop: 2 }} variant="standard" fullWidth {...props} />
                                )}
                            />
                            <FormControlLabel
                                sx={{ mt: 2 }}
                                label={"Single Use"}
                                control={
                                    <Checkbox
                                        margin="normal"
                                        type="checkbox"
                                        variant="standard"
                                        name="singleUse"
                                        value={values.singleUse}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    />
                                }
                            />
                            <FormControlLabel
                                sx={{ mt: 2 }}
                                label={"New members join as editors"}
                                control={
                                    <Checkbox
                                        margin="normal"
                                        type="checkbox"
                                        variant="standard"
                                        name="joinAsEditor"
                                        value={values.joinAsEditor}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    />
                                }
                            />

                            {isSubmitting && <LinearProgress />}
                            <DialogActions>
                                <Button type="submit" color="primary" disabled={isSubmitting} onClick={handleSubmit}>
                                    Save
                                </Button>
                                <Button color="error" onClick={onClose}>
                                    Cancel
                                </Button>
                            </DialogActions>
                        </Form>
                    )}
                </Formik>
            </DialogContent>
        </Dialog>
    );
}
