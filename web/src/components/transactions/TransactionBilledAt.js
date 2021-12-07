import React from "react";
import {TextField} from "@mui/material";
import {toast} from "react-toastify";
import {updateTransactionDetails} from "../../api";
import {DisabledTextField} from "../style/DisabledTextField";

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
        <DisabledTextField
            label="Billed At"
            views={["day"]}
            variant="standard"
            fullWidth
            value={transaction.billed_at}
            onBlur={save}
            onChange={save}
            renderInput={(params) => <TextField variant="standard" fullWidth {...params} helperText={null}/>}
            disabled={!transaction.is_wip}
        />
    );
}
