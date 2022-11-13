import { Form, Formik } from "formik";
import React from "react";
import { api } from "../../core/api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, TextField } from "@mui/material";
import ClearingSharesFormElement from "./ClearingSharesFormElement";
import * as yup from "yup";
import { selectAccountSlice, useAppDispatch, useAppSelector } from "../../store";
import { saveAccount, selectAccountById } from "@abrechnung/redux";
import { toast } from "react-toastify";

const validationSchema = yup.object({
    name: yup.string().required("Name is required"),
    description: yup.string(),
    clearingShares: yup.object(),
});

interface Props {
    groupId: number;
    accountId: number;
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
}

export const EditClearingAccountModal: React.FC<Props> = ({ groupId, show, onClose, accountId }) => {
    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const dispatch = useAppDispatch();
    // TODO: handle account does not exist

    const handleSubmit = (values, { setSubmitting }) => {
        dispatch(saveAccount({ account: { ...account, ...values }, api: api }))
            .then((res) => {
                console.log(res);
                setSubmitting(false);
                onClose({}, "completed");
            })
            .catch((err) => {
                console.log(err);
                // TODO: determine what we get from error
                // toast.error(err);
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
                        clearingShares: account?.clearingShares,
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
                                groupId={groupId}
                                clearingShares={values.clearingShares}
                                accountId={account?.id}
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
