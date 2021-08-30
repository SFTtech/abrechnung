import React, { useEffect, useState } from "react";
import List from "@material-ui/core/List";
import { toast } from "react-toastify";
import DisabledTextField from "../style/DisabledTextField";
import { updateTransactionDetails } from "../../api";
import EditableField from "../style/EditableField";

export default function TransactionDetail({ group, transaction, isEditing }) {
    const [description, setDescription] = useState("");
    const [transactionValue, setTransactionValue] = useState("");

    useEffect(() => {
        // TODO: incorporate pending changes
        setDescription(transaction.description);
        setTransactionValue(transaction.value.toFixed(2));
    }, [transaction, setDescription, setTransactionValue]);

    const save = (params) => {
        if (isEditing) {
            updateTransactionDetails({
                groupID: group.id,
                transactionID: transaction.id,
                currencyConversionRate: transaction.currency_conversion_rate,
                currencySymbol: transaction.currency_symbol,
                value: transaction.value,
                description: transaction.description,
                ...params
            }).catch(err => {
                // something else
                toast.error(err);
            });
        }
    };

    return (
        <List>
            {isEditing ? (
                <>
                    <EditableField
                        label="Description"
                        margin="normal"
                        onChange={(description) => save({ description: description })}
                        value={description}
                    />

                    <EditableField
                        label="Value"
                        margin="normal"
                        validate={value => !isNaN(parseFloat(value))}
                        helperText="please input a valid decimal number"
                        onChange={(value) => save({ value: parseFloat(value) })}
                        value={transactionValue}
                    />
                </>
            ) : (
                <>
                    <DisabledTextField
                        label="Description"
                        margin="normal"
                        fullWidth
                        value={transaction.description}
                        disabled={true}
                    />
                    <DisabledTextField
                        label="Value"
                        margin="normal"
                        fullWidth
                        value={`${transaction.value.toFixed(2)} ${transaction.currency_symbol}`}
                        disabled={true}
                    />
                </>
            )}

        </List>
    );
}