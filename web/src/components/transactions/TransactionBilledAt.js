import React, { useEffect, useState } from "react";
import List from "@material-ui/core/List";
import { toast } from "react-toastify";
import DisabledTextField from "../style/DisabledTextField";
import { updateTransactionDetails } from "../../api";
import { KeyboardDatePicker } from "@material-ui/pickers";
import { DateTime } from "luxon";

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
                <KeyboardDatePicker
                    disableToolbar
                    variant="inline"
                    label="Billed At"
                    fullWidth
                    format="yyyy-MM-dd"
                    value={billedAt}
                    onBlur={save}
                    onChange={onChange}
                    KeyboardButtonProps={{
                        "aria-label": "change date"
                    }}
                />
            ) : (
                <DisabledTextField
                    label="Billed At"
                    fullWidth
                    value={transaction.billed_at}
                    disabled={true}
                />
            )}

        </List>
    );
}
