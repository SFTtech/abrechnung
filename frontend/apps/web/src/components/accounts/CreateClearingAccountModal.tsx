import * as yup from "yup";
import { Form, Formik, FormikProps } from "formik";
import { toast } from "react-toastify";
import { api } from "../../core/api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, TextField } from "@mui/material";
import ClearingSharesFormElement from "./ClearingSharesFormElement";
import React, { ReactNode } from "react";
import { selectAccountSlice, useAppDispatch, useAppSelector } from "../../store";
import { selectGroupAccounts } from "@abrechnung/redux";
import { createAccount } from "@abrechnung/redux";

interface FormValues {
    name: string;
    description: string;
    clearingShares: { [k: number]: number };
}

const validationSchema = yup.object({
    name: yup.string().required("Name is required"),
    description: yup.string(),
    clearingShares: yup.object(),
});

interface Props {
    groupId: number;
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
    initialValues: FormValues | null;
}

export const CreateClearingAccountModal: React.FC<Props> = ({ show, onClose, groupId, initialValues }) => {
    const accounts = useAppSelector((state) => selectGroupAccounts({ state: selectAccountSlice(state), groupId }));
    const dispatch = useAppDispatch();

    const initial =
        initialValues != null
            ? initialValues
            : {
                  name: "",
                  description: "",
                  clearingShares: accounts.reduce((map, curr) => {
                      map[curr.id] = 0.0;
                      return map;
                  }, {}),
              };

    const handleSubmit = (values, { setSubmitting }) => {
        dispatch(
            createAccount({ account: { ...values, groupID: groupId, type: "clearing" }, api: api, keepWip: false })
        )
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
                                groupId={groupId}
                                clearingShares={values.clearingShares}
                                setClearingShares={(clearingShares) => setFieldValue("clearingShares", clearingShares)}
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

export default CreateClearingAccountModal;
