import * as yup from "yup";
import { Form, Formik, FormikProps } from "formik";
import { toast } from "react-toastify";
import { createAccount } from "../../core/api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, TextField } from "@mui/material";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { accountsSeenByUser, addAccount, groupAccounts } from "../../state/accounts";
import ClearingSharesFormElement from "./ClearingSharesFormElement";
import React, { ReactNode } from "react";
import { Group } from "../../state/groups";

interface FormValues {
    name: string;
    description: string;
    clearing_shares: { [k: number]: number };
}

const validationSchema = yup.object({
    name: yup.string().required("Name is required"),
    description: yup.string(),
    clearing_shares: yup.object(),
});

interface Props {
    group: Group;
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
    initialValues: FormValues | null;
}

export const CreateClearingAccountModal: React.FC<Props> = ({ show, onClose, group, initialValues }) => {
    const setAccounts = useSetRecoilState(groupAccounts(group.id));
    const accounts = useRecoilValue(accountsSeenByUser(group.id));

    const initial =
        initialValues != null
            ? initialValues
            : {
                  name: "",
                  description: "",
                  clearing_shares: accounts.reduce((map, curr) => {
                      map[curr.id] = 0.0;
                      return map;
                  }, {}),
              };

    const handleSubmit = (values, { setSubmitting }) => {
        createAccount({
            groupID: group.id,
            name: values.name,
            accountType: "clearing",
            description: values.description,
            clearingShares: values.clearing_shares,
        })
            .then((account) => {
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
            <DialogTitle>Create Clearing Account</DialogTitle>

            <DialogContent>
                <Formik
                    initialValues={initial}
                    onSubmit={handleSubmit}
                    enableReinitialize={true}
                    validationSchema={validationSchema}
                >
                    {({
                        values,
                        touched,
                        errors,
                        setFieldValue,
                        handleChange,
                        handleBlur,
                        handleSubmit,
                        isSubmitting,
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
                                fullWidth
                                variant="standard"
                                name="description"
                                label="Description"
                                onBlur={handleBlur}
                                onChange={handleChange}
                                value={values.description}
                                error={touched.description && Boolean(errors.description)}
                                helperText={touched.description && (errors.description as ReactNode)}
                            />

                            <ClearingSharesFormElement
                                group={group}
                                clearingShares={values.clearing_shares}
                                setClearingShares={(clearingShares) => setFieldValue("clearing_shares", clearingShares)}
                            />

                            {isSubmitting && <LinearProgress />}
                            <DialogActions>
                                <Button color="error" onClick={() => onClose({}, "closeButton")}>
                                    Cancel
                                </Button>
                                <Button type="submit" color="primary" disabled={isSubmitting}>
                                    Save
                                </Button>
                            </DialogActions>
                        </Form>
                    )}
                </Formik>
            </DialogContent>
        </Dialog>
    );
};

export default CreateClearingAccountModal;
