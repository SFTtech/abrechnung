import React, { useEffect, useState } from "react";
import { List, TextField } from "@mui/material";
import { toast } from "react-toastify";
import { updateTransactionDetails } from "../../api";
import { DateTime } from "luxon";
import DatePicker from "@mui/lab/DatePicker";

export default function TransactionBilledAt({ group, transaction }) {
    const [billedAt, setBilledAt] = useState(DateTime.now());

    useEffect(() => {
        // TODO: incorporate pending changes
        setBilledAt(transaction.billed_at);
    }, [transaction, setBilledAt]);

    const save = () => {
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

    const onChange = (billed) => {
        setBilledAt(billed);
    };

    return (
        <List>
            {transaction.is_wip ? (
                <DatePicker
                    label="Billed At"
                    views={["day"]}
                    value={billedAt}
                    onBlur={save}
                    onChange={onChange}
                    renderInput={(params) => <TextField variant="standard" fullWidth {...params} helperText={null} />}
                />
            ) : (
                <TextField
                    label="Billed At"
                    variant="standard"
                    fullWidth
                    value={transaction.billed_at}
                    disabled={true}
                />
            )}

        </List>
    );
}
