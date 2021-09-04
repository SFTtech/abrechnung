import React, {useEffect, useState} from "react";
import List from "@material-ui/core/List";
import {toast} from "react-toastify";
import DisabledTextField from "../style/DisabledTextField";
import {updateTransactionDetails} from "../../api";
import EditableField from "../style/EditableField";

export default function TransactionValue({group, transaction}) {
    const [transactionValue, setTransactionValue] = useState("");

    useEffect(() => {
        setTransactionValue(transaction.value.toFixed(2));
    }, [transaction, setTransactionValue]);

    const save = (value) => {
        if (transaction.is_wip) {
            updateTransactionDetails({
                groupID: group.id,
                transactionID: transaction.id,
                currencyConversionRate: transaction.currency_conversion_rate,
                currencySymbol: transaction.currency_symbol,
                billedAt: transaction.billed_at,
                value: value,
                description: transaction.description,
            }).catch(err => {
                // something else
                toast.error(err);
            });
        }
    };

    return (
        <List>
            {transaction.is_wip ? (
                <EditableField
                    label="Value"
                    validate={value => !isNaN(parseFloat(value))}
                    helperText="please input a valid decimal number"
                    onChange={value => save(parseFloat(value))}
                    value={transactionValue}
                />
            ) : (
                <DisabledTextField
                    label="Value"
                    fullWidth
                    value={`${transaction.value.toFixed(2)} ${transaction.currency_symbol}`}
                    disabled={true}
                />
            )}

        </List>
    );
}
