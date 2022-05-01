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
    TextField,
} from "@mui/material";
import DatePicker from "@mui/lab/DatePicker";
import { useSetRecoilState } from "recoil";
import { addTransactionInState, groupTransactions } from "../../state/transactions";

export default function TransactionCreateModal({ group, show, onClose }) {
    const setTransactions = useSetRecoilState(groupTransactions(group.id));

    const handleSubmit = (values, { setSubmitting }) => {
        createTransaction({
            groupID: group.id,
            type: values.type,
            description: values.description,
            value: parseFloat(values.value),
            billedAt: values.billedAt.toISODate(),
            currencySymbol: "€",
            currencyConversionRate: 1.0,
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

    const validate = (values) => {
        let errors = { value: undefined, description: undefined, billedAt: undefined };
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
                <Formik
                    validate={validate}
                    initialValues={{
                        type: "purchase",
                        description: "",
                        value: "0.0",
                        billedAt: DateTime.now(),
                    }}
                    onSubmit={handleSubmit}
                >
                    {({ values, setFieldValue, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                        <Form>
                            <Select
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
                                variant="standard"
                                name="value"
                                label="Value"
                                value={values.value}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                            {isSubmitting && <LinearProgress />}
                            <DialogActions>
                                <Button
                                    type="submit"
                                    color="primary"
                                    disabled={isSubmitting}
                                    onClick={(e) => handleSubmit()}
                                >
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
