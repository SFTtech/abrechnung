import React, { useEffect, useState } from "react";
import List from "@material-ui/core/List";
import { toast } from "react-toastify";
import DisabledTextField from "../style/DisabledTextField";
import { updateTransactionDetails } from "../../api";
import { TextField } from "@material-ui/core";

export default function TransactionDescription({ group, transaction }) {
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
        <List>
            {transaction.is_wip ? (
                <TextField
                    label="Description"
                    error={error}
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
                    fullWidth
                    value={transaction.description}
                    disabled={true}
                />
            )}

        </List>
    );
}
