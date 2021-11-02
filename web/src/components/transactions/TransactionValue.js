import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import DisabledTextField from "../style/DisabledTextField";
import { updateTransactionDetails } from "../../api";
import { TextField } from "@mui/material";

export default function TransactionValue({ group, transaction }) {
    const [transactionValue, setTransactionValue] = useState("");
    const [error, setError] = useState(false);

    useEffect(() => {
        setTransactionValue(transaction.value.toFixed(2));
    }, [transaction, setTransactionValue]);

    const save = () => {
        if (!error && transaction.is_wip && transactionValue !== transaction.value) {
            updateTransactionDetails({
                groupID: group.id,
                transactionID: transaction.id,
                currencyConversionRate: transaction.currency_conversion_rate,
                currencySymbol: transaction.currency_symbol,
                billedAt: transaction.billed_at,
                value: parseFloat(transactionValue),
                description: transaction.description
            }).catch(err => {
                toast.error(err);
            });
        }
    };

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            save();
        }
    };

    const onChange = (event) => {
        const value = parseFloat(event.target.value);
        if (isNaN(value)) {
            setError(true);
        } else {
            setError(false);
        }
        setTransactionValue(event.target.value);
    };

    return (
        <>
            {transaction.is_wip ? (
                <TextField
                    label="Value"
                    helperText={error ? "please input a valid decimal number" : null}
                    variant="standard"
                    fullWidth
                    error={error}
                    onChange={onChange}
                    onKeyUp={onKeyUp}
                    onBlur={save}
                    value={transactionValue}
                />
            ) : (
                <DisabledTextField
                    label="Value"
                    variant="standard"
                    fullWidth
                    value={`${transaction.value.toFixed(2)} ${transaction.currency_symbol}`}
                    disabled={true}
                />
            )}

        </>
    );
}
