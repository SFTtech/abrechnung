import { Form, Formik } from "formik";
import React from "react";
import { toast } from "react-toastify";
import { updateAccountDetails } from "../../api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, TextField } from "@mui/material";
import { groupAccounts, updateAccount } from "../../recoil/accounts";
import { useSetRecoilState } from "recoil";

export default function EditAccountModal({ group, show, onClose, account }) {
    const setAccounts = useSetRecoilState(groupAccounts(group.id));

    const handleSubmit = (values, { setSubmitting }) => {
        updateAccountDetails({
            groupID: group.id,
            accountID: values.accountID,
            name: values.name,
            description: values.description,
        })
            .then((account) => {
                updateAccount(account, setAccounts);
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
            <DialogTitle>Edit Personal Account</DialogTitle>
            <DialogContent>
                <Formik
                    initialValues={{
                        accountID: account?.id,
                        name: account?.name,
                        description: account?.description,
                    }}
                    onSubmit={handleSubmit}
                    enableReinitialize={true}
                >
                    {({ values, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                        <Form>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                variant="standard"
                                autoFocus
                                name="name"
                                label="Account Name"
                                value={values.name}
                                onBlur={handleBlur}
                                onChange={handleChange}
                            />
                            <TextField
                                margin="normal"
                                fullWidth
                                variant="standard"
                                name="description"
                                label="Description"
                                value={values.description}
                                onBlur={handleBlur}
                                onChange={handleChange}
                            />

                            {isSubmitting && <LinearProgress />}
                            <DialogActions>
                                <Button color="primary" type="submit" onClick={handleSubmit}>
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
