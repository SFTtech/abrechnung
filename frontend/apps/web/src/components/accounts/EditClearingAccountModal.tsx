import { Form, Formik } from "formik";
import React from "react";
import { toast } from "react-toastify";
import { updateAccountDetails } from "../../core/api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, TextField } from "@mui/material";
import { AccountConsolidated, groupAccounts, updateAccount } from "../../state/accounts";
import { useSetRecoilState } from "recoil";
import ClearingSharesFormElement from "./ClearingSharesFormElement";
import * as yup from "yup";
import { Group } from "../../state/groups";

const validationSchema = yup.object({
    name: yup.string().required("Name is required"),
    description: yup.string(),
    clearingShares: yup.object(),
});

interface Props {
    group: Group;
    account: AccountConsolidated;
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
}

export const EditClearingAccountModal: React.FC<Props> = ({ group, show, onClose, account }) => {
    const setAccounts = useSetRecoilState(groupAccounts(group.id));

    const handleSubmit = (values, { setSubmitting }) => {
        updateAccountDetails({
            accountID: values.accountID,
            name: values.name,
            description: values.description,
            clearingShares: values.clearingShares,
        })
            .then((account) => {
                updateAccount(account, setAccounts);
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
            <DialogTitle>Edit Clearing Account</DialogTitle>
            <DialogContent>
                <Formik
                    initialValues={{
                        accountID: account?.id,
                        name: account?.name,
                        description: account?.description,
                        clearingShares: account?.clearing_shares,
                    }}
                    onSubmit={handleSubmit}
                    enableReinitialize={true}
                    validationSchema={validationSchema}
                >
                    {({ values, handleChange, setFieldValue, handleBlur, handleSubmit, isSubmitting }) => (
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

                            <ClearingSharesFormElement
                                group={group}
                                clearingShares={values.clearingShares}
                                accountID={account?.id}
                                setClearingShares={(clearingShares) => setFieldValue("clearingShares", clearingShares)}
                            />

                            {isSubmitting && <LinearProgress />}
                            <DialogActions>
                                <Button color="primary" type="submit">
                                    Save
                                </Button>
                                <Button color="error" onClick={() => onClose({}, "closeButton")}>
                                    Close
                                </Button>
                            </DialogActions>
                        </Form>
                    )}
                </Formik>
            </DialogContent>
        </Dialog>
    );
};

export default EditClearingAccountModal;
