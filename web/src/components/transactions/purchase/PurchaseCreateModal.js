import React from "react";
import { toast } from "react-toastify";
import { Form, Formik } from "formik";
import { createTransaction } from "../../../api";
import { DateTime } from "luxon";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, TextField } from "@mui/material";
import DatePicker from "@mui/lab/DatePicker";
import { useSetRecoilState } from "recoil";
import { addTransactionInState, groupTransactions } from "../../../recoil/transactions";
import AccountSelect from "../../style/AccountSelect";
import * as yup from "yup";

const validationSchema = yup.object({
    value: yup.number("Enter a valid decimal").required("value is required"),
    description: yup.string("Enter a description").required("description is required"),
    creditor: yup.number("Enter a description").required("from is required").positive().integer(),
    // billedAt: yup.date("Enter a description").required("from is required"),
});

export default function PurchaseCreateModal({ group, show, onClose }) {
    const setTransactions = useSetRecoilState(groupTransactions(group.id));

    const handleSubmit = (values, { setSubmitting }) => {
        createTransaction({
            groupID: group.id,
            type: "purchase",
            description: values.description,
            value: parseFloat(values.value),
            billedAt: values.billedAt.toISODate(),
            currencySymbol: "€",
            currencyConversionRate: 1.0,
            creditorShares: { [values.creditor]: 1.0 },
        })
            .then((t) => {
                addTransactionInState(t, setTransactions);
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
            <DialogTitle>Create Purchase</DialogTitle>
            <DialogContent>
                <Formik
                    initialValues={{
                        description: "",
                        value: "0.0",
                        billedAt: DateTime.now(),
                        creditor: undefined,
                    }}
                    onSubmit={handleSubmit}
                    validationSchema={validationSchema}
                >
                    {({
                        values,
                        errors,
                        touched,
                        setFieldValue,
                        handleChange,
                        handleBlur,
                        handleSubmit,
                        isSubmitting,
                    }) => (
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
                                helperText={touched.description && errors.description}
                            />
                            <DatePicker
                                margin="normal"
                                required
                                fullWidth
                                variant="standard"
                                name="billedAt"
                                inputFormat="yyyy-MM-dd"
                                renderInput={(params) => (
                                    <TextField variant="standard" fullWidth {...params} helperText={null} />
                                )}
                                label="Billed at"
                                value={values.billedAt}
                                onChange={(val) => setFieldValue("billedAt", val, true)}
                                onBlur={handleBlur}
                                // error={touched.billedAt && Boolean(errors.billedAt)}
                                // helperText={touched.billedAt && errors.billedAt}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                type="number"
                                variant="standard"
                                name="value"
                                label="Value"
                                value={values.value}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={touched.value && Boolean(errors.value)}
                                helperText={touched.value && errors.value}
                            />
                            <AccountSelect
                                label="Paid by"
                                name="creditor"
                                group={group}
                                value={values.creditor}
                                onChange={(val) => setFieldValue("creditor", val.id, true)}
                                noDisabledStyling={true}
                                disabled={false}
                                error={touched.creditor && Boolean(errors.creditor)}
                                helperText={touched.creditor && errors.creditor}
                            />
                            {isSubmitting && <LinearProgress />}
                            <DialogActions>
                                <Button type="submit" color="primary" disabled={isSubmitting} onClick={handleSubmit}>
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
