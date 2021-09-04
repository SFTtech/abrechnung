import React, {useEffect, useState} from "react";
import List from "@material-ui/core/List";
import {toast} from "react-toastify";
import DisabledTextField from "../style/DisabledTextField";
import {updateTransactionDetails} from "../../api";
import EditableField from "../style/EditableField";

export default function TransactionDescription({group, transaction}) {
    const [description, setDescription] = useState("");

    useEffect(() => {
        // TODO: incorporate pending changes
        setDescription(transaction.description);
    }, [transaction, setDescription]);

    const save = (description) => {
        if (transaction.is_wip) {
            updateTransactionDetails({
                groupID: group.id,
                transactionID: transaction.id,
                currencyConversionRate: transaction.currency_conversion_rate,
                currencySymbol: transaction.currency_symbol,
                billedAt: transaction.billed_at,
                value: transaction.value,
                description: description,
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
                    label="Description"
                    onChange={save}
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
