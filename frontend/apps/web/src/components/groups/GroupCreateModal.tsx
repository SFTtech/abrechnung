import { createGroup } from "@abrechnung/redux";
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
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import React, { ReactNode } from "react";
import { toast } from "react-toastify";
import { z } from "zod";
import { api } from "@/core/api";
import { useAppDispatch } from "@/store";
import { toFormikValidationSchema } from "@abrechnung/utils";

const validationSchema = z.object({
    name: z.string({ required_error: "Name is required" }),
    description: z.string().optional(),
    addUserAccountOnJoin: z.boolean(),
});

type FormValues = z.infer<typeof validationSchema>;

interface Props {
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
}

export const GroupCreateModal: React.FC<Props> = ({ show, onClose }) => {
    const dispatch = useAppDispatch();

    const handleSubmit = (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
        dispatch(
            createGroup({
                api,
                group: {
                    name: values.name,
                    description: values.description,
                    currency_symbol: "€",
                    terms: "",
                    add_user_account_on_join: values.addUserAccountOnJoin,
                },
            })
        )
            .unwrap()
            .then(() => {
                setSubmitting(false);
                onClose({}, "completed");
            })
            .catch((err) => {
                toast.error(err);
                setSubmitting(false);
            });
    };

    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Create Group</DialogTitle>
            <DialogContent>
                <Formik
                    initialValues={{
                        name: "",
                        description: "",
                        addUserAccountOnJoin: false,
                    }}
                    onSubmit={handleSubmit}
                    validationSchema={toFormikValidationSchema(validationSchema)}
                >
                    {({
                        values,
                        touched,
                        errors,
                        handleBlur,
                        handleChange,
                        isSubmitting,
                        setFieldValue,
                    }: FormikProps<FormValues>) => (
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
                                helperText={touched.name && (errors.name as ReactNode)}
                            />
                            <TextField
                                margin="normal"
                                fullWidth
                                variant="standard"
                                type="text"
                                name="description"
                                label="Description"
                                value={values.description}
                                onBlur={handleBlur}
                                onChange={handleChange}
                                error={touched.description && Boolean(errors.description)}
                                helperText={touched.description && (errors.description as ReactNode)}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name="addUserAccountOnJoin"
                                        onChange={(e) => setFieldValue("addUserAccountOnJoin", e.target.checked)}
                                        checked={values.addUserAccountOnJoin}
                                    />
                                }
                                label="Automatically add accounts for newly joined group members"
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

export default GroupCreateModal;
