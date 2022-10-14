import { Form, Formik } from "formik";
import React from "react";
import { toast } from "react-toastify";
import { createGroupInvite } from "../../core/api";
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
import { DateTimePicker } from "@mui/x-date-pickers";
import { Group } from "../../state/groups";

interface Props {
    group: Group;
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
}

export const InviteLinkCreate: React.FC<Props> = ({ show, onClose, group }) => {
    const handleSubmit = (values, { setSubmitting }) => {
        createGroupInvite({
            groupID: group.id,
            description: values.description,
            validUntil: values.validUntil,
            singleUse: values.singleUse,
            joinAsEditor: values.joinAsEditor,
        })
            .then((result) => {
                toast.success("Successfully created invite token");
                setSubmitting(false);
                onClose({}, "completed");
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
                                inputFormat="yyyy-MM-dd HH:mm"
                                value={values.validUntil}
                                onChange={(val) => setFieldValue("validUntil", val, true)}
                                renderInput={(props) => (
                                    <TextField
                                        name="validUntil"
                                        sx={{ marginTop: 2 }}
                                        variant="standard"
                                        fullWidth
                                        {...props}
                                    />
                                )}
                            />
                            <FormControlLabel
                                sx={{ mt: 2 }}
                                label={"Single Use"}
                                control={
                                    <Checkbox
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
                                        name="joinAsEditor"
                                        value={values.joinAsEditor}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    />
                                }
                            />

                            {isSubmitting && <LinearProgress />}
                            <DialogActions>
                                <Button type="submit" color="primary" disabled={isSubmitting}>
                                    Save
                                </Button>
                                <Button color="error" onClick={() => onClose({}, "closeButton")}>
                                    Cancel
                                </Button>
                            </DialogActions>
                        </Form>
                    )}
                </Formik>
            </DialogContent>
        </Dialog>
    );
};

export default InviteLinkCreate;
