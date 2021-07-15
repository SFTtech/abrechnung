import React, {useEffect, useState} from "react";
import {updateTransaction} from "../../recoil/transactions";
import List from "@material-ui/core/List";
import TextField from "@material-ui/core/TextField";
import {toast} from "react-toastify";

export default function TransactionDetail({group, transaction, wipRevision}) {
    const editing = wipRevision !== null;

    const [description, setDescription] = useState("");
    const [transactionValue, setTransactionValue] = useState("");

    useEffect(() => {
        setDescription(transaction.description);
        setTransactionValue(transaction.value);
    }, [transaction, setDescription, setTransactionValue])

    const save = (params) => {
        if (wipRevision !== null) {
            updateTransaction({
                transactionID: transaction.transaction_id,
                revisionID: wipRevision.revision_id,
                currencyConversionRate: transaction.currency_conversion_rate,
                currencySymbol: transaction.currency_symbol,
                value: transaction.value,
                description: transaction.description,
                ...params
            }).catch(err => {
                // something else
                toast.error(`Error updating transaction: ${err}!`);
            })
        }
    }

    return (
        <List>
            {editing ? (
                <>
                    <TextField
                        label="Description"
                        margin="normal"
                        fullWidth
                        onBlur={(event) => save({description: event.target.value})}
                        value={description}
                        onChange={event => setDescription(event.target.value)}
                    />

                    <TextField
                        label="Value"
                        margin="normal"
                        fullWidth
                        onBlur={(event) => save({value: parseFloat(event.target.value)})}
                        value={transactionValue}
                        onChange={event => setTransactionValue(event.target.value)}
                    />
                </>
            ) : (
                <>
                    <TextField
                        label="Description"
                        margin="normal"
                        fullWidth
                        value={transaction.description}
                        disabled={true}
                    />
                    <TextField
                        label="Value"
                        margin="normal"
                        fullWidth
                        value={transaction.value}
                        disabled={true}
                    />
                </>
            )}

        </List>
    )
}