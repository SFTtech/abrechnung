import React, {useEffect, useState} from "react";
import {toast} from "react-toastify";
import {updateTransactionDetails} from "../../api";
import {DisabledTextField} from "../style/DisabledTextField";
import {useSetRecoilState} from "recoil";
import {groupTransactions, updateTransaction} from "../../recoil/transactions";

export default function TransactionValue({group, transaction}) {
    const [transactionValue, setTransactionValue] = useState("");
    const [error, setError] = useState(false);
    const setTransactions = useSetRecoilState(groupTransactions(transaction.group_id));

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
            })
                .then(t => {
                    updateTransaction(t, setTransactions);
                })
                .catch(err => {
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
        <DisabledTextField
            label="Value"
            helperText={error ? "please input a valid decimal number" : null}
            variant="standard"
            fullWidth
            error={error}
            onChange={onChange}
            onKeyUp={onKeyUp}
            onBlur={save}
            value={transactionValue}
            disabled={!transaction.is_wip}
        />
    );
}
