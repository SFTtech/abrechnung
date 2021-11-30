import React from "react";
import {List, TextField} from "@mui/material";
import {toast} from "react-toastify";
import {updateTransactionDetails} from "../../api";
import DatePicker from "@mui/lab/DatePicker";
import {DisabledTextField} from "../style/DisabledTextField";
import {DateTime} from "luxon";

export default function TransactionBilledAt({group, transaction}) {
    const save = (billedAt) => {
        if (transaction.is_wip && billedAt !== transaction.billed_at) {
            updateTransactionDetails({
                groupID: group.id,
                transactionID: transaction.id,
                currencyConversionRate: transaction.currency_conversion_rate,
                currencySymbol: transaction.currency_symbol,
                billedAt: billedAt.toISODate(),
                value: transaction.value,
                description: transaction.description
            }).catch(err => {
                // something else
                toast.error(err);
            });
        }
    };

    return (
        <List>
            {transaction.is_wip ? (
                <DatePicker
                    label="Billed At"
                    views={["day"]}
                    value={transaction.billed_at}
                    onBlur={save}
                    onChange={save}
                    renderInput={(params) => <TextField variant="standard" fullWidth {...params} helperText={null}/>}
                />
            ) : (
                <DisabledTextField
                    label="Billed At"
                    variant="standard"
                    fullWidth
                    value={DateTime.fromISO(transaction.billed_at).toLocaleString()}
                />
            )}

        </List>
    );
}
