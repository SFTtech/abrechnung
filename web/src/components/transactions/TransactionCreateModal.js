import React from "react";
import { toast } from "react-toastify";
import { Form, Formik } from "formik";
import { createTransaction } from "../../api";
import { DateTime } from "luxon";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    MenuItem,
    Select,
    TextField
} from "@mui/material";
import { DateTimePicker } from "@mui/lab";
import DatePicker from "@mui/lab/DatePicker";

export default function TransactionCreateModal({ group, show, onClose }) {
    const handleSubmit = (values, { setSubmitting }) => {
        createTransaction({
            groupID: group.id,
            type: values.type,
            description: values.description,
            value: parseFloat(values.value),
            billedAt: values.billedAt.toISODate(),
            currencySymbol: "€",
            currencyConversionRate: 1.0
        })
            .then(result => {
                setSubmitting(false);
                onClose();
            })
            .catch(err => {
                toast.error(err);
                setSubmitting(false);
            });
    };

    const validate = (values) => {
        let errors = {};
        const floatValue = parseFloat(values.value);
        if (isNaN(floatValue) || floatValue <= 0) {
            errors.value = "please input a valid decimal number";
        }
        if (values.description === null || values.description === undefined || values.description === "") {
            errors.description = "please input a description";
        }
        if (values.billedAt === null || values.billedAt === undefined || values.billedAt === "") {
            errors.billedAt = "please input valid billed at time";
        }
        return errors;
    };

    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Create Transaction</DialogTitle>
            <DialogContent>
                <Formik validate={validate}
                        initialValues={{ type: "purchase", description: "", value: "0.0", billedAt: DateTime.now() }}
                        onSubmit={handleSubmit}>
                    {({ values, setFieldValue, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                        <Form>
                            <Select
                                margin="normal"
                                required
                                value={values.type}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                variant="standard"
                                name="type"
                            >
                                <MenuItem value="purchase">Purchase</MenuItem>
                                <MenuItem value="transfer">Transfer</MenuItem>
                                {/*<MenuItem value="mimo">MIMO</MenuItem>*/}
                            </Select>
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
                            />
                            <DatePicker
                                margin="normal"
                                required
                                fullWidth
                                variant="standard"
                                name="billedAt"
                                renderInput={(params) => <TextField variant="standard" fullWidth {...params}
                                                                    helperText={null} />}
                                label="Billed at"
                                value={values.billedAt}
                                onChange={val => setFieldValue("billedAt", val, true)}
                                onBlur={handleBlur}
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
                            />
                            {isSubmitting && <LinearProgress />}
                            <DialogActions>
                                <Button color="secondary" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    color="primary"
                                    disabled={isSubmitting}
                                    onClick={handleSubmit}
                                >
                                    Save
                                </Button>
                            </DialogActions>
                        </Form>)}
                </Formik>
            </DialogContent>
        </Dialog>
    );
}