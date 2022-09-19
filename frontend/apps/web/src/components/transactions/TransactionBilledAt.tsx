import React, { useState } from "react";
import { DisabledTextField } from "../style/DisabledTextField";
import { DatePicker } from "@mui/x-date-pickers";
import { TextField } from "@mui/material";
import { useSetRecoilState } from "recoil";
import { pendingTransactionDetailChanges } from "../../state/transactions";

export default function TransactionBilledAt({ group, transaction }) {
    const [error, setError] = useState(null);
    const setLocalTransactionDetails = useSetRecoilState(pendingTransactionDetailChanges(transaction.id));

    const save = (billedAt) => {
        if (billedAt == null || billedAt.invalid) {
            setError("Invalid date format");
            return;
        }
        setError(null);
        if (transaction.is_wip && billedAt !== transaction.billed_at) {
            setLocalTransactionDetails((currState) => {
                return {
                    ...currState,
                    billed_at: billedAt,
                };
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
            value={transaction.billed_at}
            onChange={save}
            renderInput={(params) => (
                <TextField variant="standard" fullWidth {...params} helperText={error} error={error !== null} />
            )}
        />
    );
}
