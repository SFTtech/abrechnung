import { Group } from "@abrechnung/api";
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
import { Form, Formik, FormikHelpers } from "formik";
import { DateTime } from "luxon";
import React from "react";
import { toast } from "react-toastify";
import { api } from "@/core/api";

interface Props {
    group: Group;
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
}

type FormValues = {
    description: string;
    validUntil: DateTime;
    singleUse: boolean;
    joinAsEditor: boolean;
};

export const InviteLinkCreate: React.FC<Props> = ({ show, onClose, group }) => {
    const handleSubmit = (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
        api.client.groups
            .createInvite({
                groupId: group.id,
                requestBody: {
                    description: values.description,
                    valid_until: values.validUntil.toISO()!,
                    single_use: values.singleUse,
                    join_as_editor: values.joinAsEditor,
                },
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
                                format="yyyy-MM-dd HH:mm"
                                value={values.validUntil}
                                onChange={(val) => setFieldValue("validUntil", val, true)}
                                slotProps={{
                                    textField: {
                                        name: "validUntil",
                                        sx: { marginTop: 2 },
                                        variant: "standard",
                                        fullWidth: true,
                                    },
                                }}
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
