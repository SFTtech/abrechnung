import React, {useEffect, useState} from "react";
import {toast} from "react-toastify";
import {updateTransactionDetails} from "../../api";
import {TextField} from "@mui/material";
import {DisabledTextField} from "../style/DisabledTextField";

export default function TransactionDescription({group, transaction}) {
    const [description, setDescription] = useState("");
    const [error, setError] = useState(false);

    useEffect(() => {
        setDescription(transaction.description);
    }, [transaction, setDescription]);

    const save = () => {
        if (!error && transaction.is_wip && description !== transaction.description) {
            updateTransactionDetails({
                groupID: group.id,
                transactionID: transaction.id,
                currencyConversionRate: transaction.currency_conversion_rate,
                currencySymbol: transaction.currency_symbol,
                billedAt: transaction.billed_at,
                value: transaction.value,
                description: description
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
        const value = event.target.value;
        if (value == null || value === "") {
            setError(true);
        } else {
            setError(false);
        }
        setDescription(value);
    };

    return (
        <>
            {transaction.is_wip ? (
                <TextField
                    label="Description"
                    error={error}
                    variant="standard"
                    helperText={error ? "please input a description" : null}
                    fullWidth
                    onChange={onChange}
                    onKeyUp={onKeyUp}
                    onBlur={save}
                    value={description}
                />
            ) : (
                <DisabledTextField
                    label="Description"
                    variant="standard"
                    fullWidth
                    value={transaction.description}
                />
            )}

        </>
    );
}
