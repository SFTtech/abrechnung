import React, { ReactNode } from "react";
import * as yup from "yup";
import { Form, Formik } from "formik";
import { toast } from "react-toastify";
import { createAccount } from "../../api";
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

const validationSchema = yup.object({
    name: yup.string().required("Name is required"),
    description: yup.string(),
});

export default function CreateAccountModal({ show, onClose, group }) {
    const setAccounts = useSetRecoilState(groupAccounts(group.id));
    const userPermissions = useRecoilValue(currUserPermissions(group.id));
    const currentUser = useRecoilValue(userData);

    const handleSubmit = (values, { setSubmitting }) => {
        createAccount({
            groupID: group.id,
            name: values.name,
            owningUserID: values.owningUserID,
            description: values.description,
        })
            .then((account) => {
                toast.success(`Created account ${values.name}`);
                addAccount(account, setAccounts);
                setSubmitting(false);
                onClose();
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
                    }) => (
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
                            {userPermissions.is_owner ? (
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
