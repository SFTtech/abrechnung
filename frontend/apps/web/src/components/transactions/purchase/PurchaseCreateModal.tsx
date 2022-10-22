import React, { ReactNode } from "react";
import { toast } from "react-toastify";
import { Form, Formik, FormikProps } from "formik";
import { api } from "../../../core/api";
import { DateTime } from "luxon";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { useSetRecoilState } from "recoil";
import { addTransactionInState, groupTransactions } from "../../../state/transactions";
import AccountSelect from "../../style/AccountSelect";
import * as yup from "yup";
import { Group, Account } from "@abrechnung/types";

interface FormValues {
    value: string;
    description: string;
    billedAt: DateTime;
    creditor: Account;
}

const validationSchema = yup.object({
    value: yup.number().required("value is required"),
    description: yup.string().required("description is required"),
    creditor: yup.object().required("from is required"),
    // billedAt: yup.date("Enter a description").required("from is required"),
});

interface Props {
    group: Group;
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
}

export const PurchaseCreateModal: React.FC<Props> = ({ group, show, onClose }) => {
    const setTransactions = useSetRecoilState(groupTransactions(group.id));
    const initialValues: FormValues = {
        description: "",
        value: "0.0",
        billedAt: DateTime.now(),
        creditor: undefined,
    };

    const handleSubmit = (values, { setSubmitting }) => {
        api.createTransaction(
            group.id,
            "purchase",
            values.description,
            parseFloat(values.value),
            values.billedAt.toJSDate(),
            group.currencySymbol,
            1.0,
            { [values.creditor.id]: 1.0 },
            null
        )
            .then((t) => {
                addTransactionInState(t, setTransactions);
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
            <DialogTitle>Create Purchase</DialogTitle>
            <DialogContent>
                <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={validationSchema}>
                    {({
                        values,
                        errors,
                        touched,
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
                                variant="standard"
                                name="description"
                                label="Description"
                                autoFocus
                                value={values.description}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={touched.description && Boolean(errors.description)}
                                helperText={touched.description && (errors.description as ReactNode)}
                            />
                            <DatePicker
                                inputFormat="yyyy-MM-dd"
                                renderInput={(params) => (
                                    <TextField
                                        name="billedAt"
                                        required
                                        variant="standard"
                                        fullWidth
                                        {...params}
                                        helperText={null}
                                    />
                                )}
                                label="Billed at"
                                value={values.billedAt}
                                onChange={(val) => setFieldValue("billedAt", val, true)}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                type="number"
                                inputProps={{ step: "any" }}
                                variant="standard"
                                name="value"
                                label="Value"
                                value={values.value}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={touched.value && Boolean(errors.value)}
                                helperText={touched.value && (errors.value as ReactNode)}
                            />
                            <AccountSelect
                                label="Paid by"
                                name="creditor"
                                group={group}
                                value={values.creditor}
                                onChange={(val) => setFieldValue("creditor", val, true)}
                                noDisabledStyling={true}
                                disabled={false}
                                error={touched.creditor && Boolean(errors.creditor)}
                                helperText={touched.creditor && (errors.creditor as ReactNode)}
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

export default PurchaseCreateModal;
