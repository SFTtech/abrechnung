import { createTransfer, selectGroupCurrencySymbol } from "@abrechnung/redux";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { Form, Formik, FormikProps } from "formik";
import { DateTime } from "luxon";
import React, { ReactNode } from "react";
import { toast } from "react-toastify";
import * as yup from "yup";
import AccountSelect from "../../../../components/AccountSelect";
import { api } from "../../../../core/api";
import { selectGroupSlice, useAppDispatch, useAppSelector } from "../../../../store";

interface FormValues {
    value: number;
    name: string;
    description: string;
    tags: string[];
    billedAt: DateTime;
    creditor: number;
    debitor: number;
}

const validationSchema = yup.object({
    value: yup.number().required("value is required"),
    name: yup.string().required("name is required"),
    description: yup.string(),
    creditor: yup.object().required("from is required"),
    debitor: yup.object().required("to is required"),
    // billedAt: yup.date("Enter a description").required("from is required"),
});

interface Props {
    groupId: number;
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
}

export const TransferCreateModal: React.FC<Props> = ({ groupId, show, onClose }) => {
    const currencySymbol = useAppSelector((state) =>
        selectGroupCurrencySymbol({ state: selectGroupSlice(state), groupId })
    );

    const dispatch = useAppDispatch();

    const handleSubmit = (values: FormValues, { setSubmitting }) => {
        console.log(values);
        dispatch(
            createTransfer({
                transaction: {
                    groupID: groupId,
                    type: "transfer",
                    name: values.name,
                    description: values.description,
                    value: values.value,
                    billedAt: values.billedAt.toISODate(),
                    tags: values.tags,
                    currencySymbol: currencySymbol,
                    currencyConversionRate: 1.0,
                    creditorShares: { [values.creditor]: 1.0 },
                    debitorShares: { [values.debitor]: 1.0 },
                },
                api: api,
                keepWip: false,
            })
        )
            .then((res) => {
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
            <DialogTitle>Create Transfer</DialogTitle>
            <DialogContent>
                <Formik
                    initialValues={{
                        name: "",
                        description: "",
                        value: null,
                        tags: [],
                        billedAt: DateTime.now(),
                        creditor: undefined,
                        debitor: undefined,
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
                    }: FormikProps<FormValues>) => (
                        <Form>
                            <TextField
                                margin="normal"
                                fullWidth
                                variant="standard"
                                name="name"
                                label="Name"
                                autoFocus
                                value={values.name}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={touched.name && Boolean(errors.name)}
                                helperText={touched.name && (errors.name as ReactNode)}
                            />
                            <TextField
                                margin="normal"
                                fullWidth
                                variant="standard"
                                name="description"
                                label="Description"
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
                                        margin="normal"
                                        variant="standard"
                                        fullWidth
                                        {...params}
                                        helperText={null}
                                    />
                                )}
                                label="Billed at"
                                value={values.billedAt}
                                onChange={(val) => setFieldValue("billedAt", val, true)}
                                // error={touched.billedAt && Boolean(errors.billedAt)}
                                // helperText={touched.billedAt && errors.billedAt}
                            />
                            <TextField
                                margin="normal"
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
                                label="From"
                                name="creditor"
                                groupId={groupId}
                                value={values.creditor}
                                onChange={(val) => setFieldValue("creditor", val, true)}
                                noDisabledStyling={true}
                                disabled={false}
                                error={touched.creditor && Boolean(errors.creditor)}
                                helperText={touched.creditor && (errors.creditor as string)}
                            />
                            <AccountSelect
                                label="To"
                                name="debitor"
                                groupId={groupId}
                                value={values.debitor}
                                onChange={(val) => setFieldValue("debitor", val, true)}
                                noDisabledStyling={true}
                                disabled={false}
                                error={touched.debitor && Boolean(errors.debitor)}
                                helperText={touched.debitor && (errors.debitor as string)}
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

export default TransferCreateModal;
