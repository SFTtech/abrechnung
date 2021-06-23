import React from "react";
import {useRecoilValue} from "recoil";
import {sessionToken} from "../../recoil/auth";
import {updateTransaction} from "../../recoil/transactions";
import List from "@material-ui/core/List";
import EditableField from "../style/EditableField";
import TextField from "@material-ui/core/TextField";
import {toast} from "react-toastify";

export default function TransactionDetail({group, transaction, wipRevision}) {
    const authtoken = useRecoilValue(sessionToken);
    const editing = wipRevision !== null;

    const save = (params) => {
        if (wipRevision !== null) {
            updateTransaction({
                sessionToken: authtoken,
                transactionID: transaction.transaction_id,
                revisionID: wipRevision.revision_id,
                currencyConversionRate: transaction.currency_conversion_rate,
                currencySymbol: transaction.currency_symbol,
                value: transaction.value,
                description: transaction.description,
                ...params
            }).then(result => {
                toast.success(`Updated transaction!`, {
                    position: "top-right",
                    autoClose: 5000,
                });
            }).catch(err => {
                // something else
            })
        }
    }

    return (
        <List>
            {editing ? (
                <>
                    <EditableField
                        label="Description"
                        margin="normal"
                        value={transaction.description}
                        onChange={description => save({description: description})}
                    />

                    <EditableField
                        label="Value"
                        margin="normal"
                        value={transaction.value}
                        onChange={value => save({value: parseFloat(value)})}
                    />
                </>
            ) : (
                <>
                    <TextField
                        label="Description"
                        margin="normal"
                        value={transaction.description}
                        disabled={true}
                    />
                    <TextField
                        label="Value"
                        margin="normal"
                        value={transaction.value}
                        disabled={true}
                    />
                </>
            )}

        </List>
    )
}