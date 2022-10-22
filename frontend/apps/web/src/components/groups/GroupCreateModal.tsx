import React, { ReactNode } from "react";
import { toast } from "react-toastify";
import { Form, Formik, FormikProps } from "formik";
import { api } from "../../core/api";
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
import * as yup from "yup";

interface FormValues {
    name: string;
    description: string;
    addUserAccountOnJoin: boolean;
}

const validationSchema = yup.object({
    name: yup.string().required("Name is required"),
    description: yup.string(),
});

interface Props {
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
}

export const GroupCreateModal: React.FC<Props> = ({ show, onClose }) => {
    const handleSubmit = (values, { setSubmitting }) => {
        api.createGroup(values.name, values.description, "€", "", values.addUserAccountOnJoin)
            .then((result) => {
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
                    validationSchema={validationSchema}
                >
                    {({
                        values,
                        touched,
                        errors,
                        handleBlur,
                        handleChange,
                        handleSubmit,
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
