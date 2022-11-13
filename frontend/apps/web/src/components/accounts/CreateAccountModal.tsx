import React, { ReactNode } from "react";
import * as yup from "yup";
import { Form, Formik, FormikProps } from "formik";
import { toast } from "react-toastify";
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
import GroupMemberSelect from "../groups/GroupMemberSelect";
import { useAppDispatch, useAppSelector, selectAuthSlice } from "../../store";
import { createAccount, selectCurrentUserId, selectCurrentUserPermissions } from "@abrechnung/redux";

interface FormValues {
    name: string;
    description: string;
    owningUserID: number | null;
}

const validationSchema = yup.object({
    name: yup.string().required("Name is required"),
    description: yup.string(),
});

interface Props {
    groupId: number;
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
}

export const CreateAccountModal: React.FC<Props> = ({ show, onClose, groupId }) => {
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const currentUserId = useAppSelector((state) => selectCurrentUserId({ state: selectAuthSlice(state) }));
    const dispatch = useAppDispatch();

    const handleSubmit = (values, { setSubmitting }) => {
        dispatch(
            createAccount({ account: { ...values, groupID: groupId, type: "personal" }, api: api, keepWip: false })
        )
            .then((res) => {
                console.log(res);
                setSubmitting(false);
                onClose({}, "completed");
            })
            .catch((err) => {
                console.log(err);
                // TODO: determine what we get from error
                toast.error(err);
                setSubmitting(false);
            });
    };

    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Create Personal Account</DialogTitle>

            <DialogContent>
                <Formik
                    initialValues={{ name: "", description: "", owningUserID: null }}
                    onSubmit={handleSubmit}
                    validationSchema={validationSchema}
                >
                    {({
                        values,
                        touched,
                        errors,
                        handleChange,
                        handleBlur,
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
                                name="name"
                                label="Account Name"
                                onBlur={handleBlur}
                                onChange={handleChange}
                                value={values.name}
                                error={touched.name && Boolean(errors.name)}
                                helperText={touched.name && (errors.name as ReactNode)}
                            />
                            <TextField
                                margin="normal"
                                name="description"
                                fullWidth
                                variant="standard"
                                label="Description"
                                onBlur={handleBlur}
                                onChange={handleChange}
                                value={values.description}
                                error={touched.description && Boolean(errors.description)}
                                helperText={touched.description && (errors.description as ReactNode)}
                            />
                            {permissions.isOwner ? (
                                <GroupMemberSelect
                                    margin="normal"
                                    groupId={groupId}
                                    label="Owning user"
                                    value={values.owningUserID}
                                    onChange={(user_id) => setFieldValue("owningUserID", user_id)}
                                />
                            ) : (
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="owningUserID"
                                            onChange={(e) =>
                                                setFieldValue("owningUserID", e.target.checked ? currentUserId : null)
                                            }
                                            checked={values.owningUserID === currentUserId}
                                        />
                                    }
                                    label="This is me"
                                />
                            )}

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

export default CreateAccountModal;
