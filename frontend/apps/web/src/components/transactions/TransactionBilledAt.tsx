import React, { useState } from "react";
import { DisabledTextField } from "../style/DisabledTextField";
import { DatePicker } from "@mui/x-date-pickers";
import { TextField } from "@mui/material";
import { DateTime } from "luxon";
import { useSetRecoilState } from "recoil";
import { pendingTransactionDetailChanges, Transaction } from "../../state/transactions";
import { Group } from "../../state/groups";

interface Props {
    group: Group;
    transaction: Transaction;
}

export const TransactionBilledAt: React.FC<Props> = ({ group, transaction }) => {
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
                value={transaction.billed_at.toLocaleString(DateTime.DATE_FULL)}
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
};

export default TransactionBilledAt;
