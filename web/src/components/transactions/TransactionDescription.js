import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { updateTransactionDetails } from "../../api";
import { DisabledTextField } from "../style/DisabledTextField";
import { useSetRecoilState } from "recoil";
import { groupTransactions, updateTransaction } from "../../recoil/transactions";

export default function TransactionDescription({ group, transaction }) {
    const [description, setDescription] = useState("");
    const [error, setError] = useState(false);
    const setTransactions = useSetRecoilState(groupTransactions(transaction.group_id));

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
                description: description,
            })
                .then((t) => {
                    updateTransaction(t, setTransactions);
                })
                .catch((err) => {
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
        <DisabledTextField
            label="Description"
            error={error}
            variant="standard"
            helperText={error ? "please input a description" : null}
            fullWidth
            onChange={onChange}
            onKeyUp={onKeyUp}
            onBlur={save}
            disabled={!transaction.is_wip}
            value={description}
        />
    );
}
