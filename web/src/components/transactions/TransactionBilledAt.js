import React, { useState } from "react";
import { toast } from "react-toastify";
import { updateTransactionDetails } from "../../api";
import { DisabledTextField } from "../style/DisabledTextField";
import { DatePicker } from "@mui/lab";
import { TextField } from "@mui/material";

export default function TransactionBilledAt({ group, transaction }) {
    const [error, setError] = useState(null);
    const save = (billedAt) => {
        if (billedAt == null || billedAt.invalid) {
            setError("Invalid date format");
            return;
        }
        setError(null);
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
    if (!transaction.is_wip) {
        return (
            <DisabledTextField
                label="Billed At"
                variant="standard"
                fullWidth
                value={transaction.billed_at}
                disabled={true}
            />
        );
    }

    return (
        <DatePicker
            label="Billed At"
            inputFormat="yyyy-MM-dd"
            variant="standard"
            fullWidth
            value={transaction.billed_at}
            onChange={save}
            renderInput={(params) => <TextField variant="standard"
                                                fullWidth {...params} helperText={error} error={error !== null} />}
        />
    );
}
