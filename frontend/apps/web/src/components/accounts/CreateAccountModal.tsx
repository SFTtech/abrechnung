import React, { ReactNode } from "react";
import * as yup from "yup";
import { Group, Account } from "@abrechnung/types";
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
import { useRecoilValue, useSetRecoilState } from "recoil";
import { addAccount, groupAccounts } from "../../state/accounts";
import GroupMemberSelect from "../groups/GroupMemberSelect";
import { currUserPermissions } from "../../state/groups";
import { userData } from "../../state/auth";

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
    group: Group;
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
}

export const CreateAccountModal: React.FC<Props> = ({ show, onClose, group }) => {
    const setAccounts = useSetRecoilState(groupAccounts(group.id));
    const userPermissions = useRecoilValue(currUserPermissions(group.id));
    const currentUser = useRecoilValue(userData);

    const handleSubmit = (values, { setSubmitting }) => {
        api.createAccount(group.id, "personal", values.name, values.description, null, values.owningUserID)
            .then((account: Account) => {
                toast.success(`Created account ${values.name}`);
                addAccount(account, setAccounts);
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
                            {userPermissions.isOwner ? (
                                <GroupMemberSelect
                                    margin="normal"
                                    group={group}
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
                                                setFieldValue("owningUserID", e.target.checked ? currentUser.id : null)
                                            }
                                            checked={values.owningUserID === currentUser.id}
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
