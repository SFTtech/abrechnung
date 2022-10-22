import React, { useState } from "react";
import { DisabledTextField } from "../style/DisabledTextField";
import { DatePicker } from "@mui/x-date-pickers";
import { TextField } from "@mui/material";
import { DateTime } from "luxon";
import { useSetRecoilState } from "recoil";
import { pendingTransactionDetailChanges } from "../../state/transactions";
import { Transaction } from "@abrechnung/types";

interface Props {
    transaction: Transaction;
}

export const TransactionBilledAt: React.FC<Props> = ({ transaction }) => {
    const [error, setError] = useState(null);
    const setLocalTransactionDetails = useSetRecoilState(pendingTransactionDetailChanges(transaction.id));

    const save = (billedAt) => {
        if (billedAt == null || billedAt.invalid) {
            setError("Invalid date format");
            return;
        }
        setError(null);
        if (transaction.isWip && billedAt !== transaction.details.billedAt) {
            setLocalTransactionDetails((currState) => {
                return {
                    ...currState,
                    billed_at: billedAt,
                };
            });
        }
    };
    if (!transaction.isWip) {
        return (
            <DisabledTextField
                label="Billed At"
                variant="standard"
                fullWidth
                value={DateTime.fromJSDate(transaction.details.billedAt).toLocaleString(DateTime.DATE_FULL)}
                disabled={true}
            />
        );
    }

    return (
        <DatePicker
            label="Billed At"
            inputFormat="yyyy-MM-dd"
            value={DateTime.fromJSDate(transaction.details.billedAt)}
            onChange={save}
            renderInput={(params) => (
                <TextField variant="standard" fullWidth {...params} helperText={error} error={error !== null} />
            )}
        />
    );
};

export default TransactionBilledAt;
