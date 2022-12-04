import React, { useState } from "react";
import { DisabledTextField } from "../style/DisabledTextField";
import { DatePicker } from "@mui/x-date-pickers";
import { TextField } from "@mui/material";
import { DateTime } from "luxon";
import { useAppSelector, useAppDispatch, selectTransactionSlice } from "../../store";
import { selectTransactionById, wipTransactionUpdated } from "@abrechnung/redux";

interface Props {
    groupId: number;
    transactionId: number;
}

export const TransactionBilledAt: React.FC<Props> = ({ groupId, transactionId }) => {
    const [error, setError] = useState(null);

    const dispatch = useAppDispatch();

    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    const save = (billedAt: DateTime) => {
        //if (billedAt == null || billedAt.invalid) {
        if (billedAt == null) {
            setError("Invalid date format");
            return;
        }
        const formatted = billedAt.toISODate();
        setError(null);
        if (transaction.isWip && formatted !== transaction.billedAt) {
            dispatch(wipTransactionUpdated({ ...transaction, billedAt: formatted }));
        }
    };
    if (!transaction.isWip) {
        return (
            <DisabledTextField
                label="Billed At"
                variant="standard"
                fullWidth
                value={DateTime.fromISO(transaction.billedAt).toLocaleString(DateTime.DATE_FULL)}
                disabled={true}
            />
        );
    }

    return (
        <DatePicker
            label="Billed At"
            inputFormat="yyyy-MM-dd"
            value={DateTime.fromISO(transaction.billedAt)}
            onChange={save}
            renderInput={(params) => (
                <TextField
                    variant="standard"
                    margin="normal"
                    fullWidth
                    {...params}
                    helperText={error}
                    error={error !== null}
                />
            )}
        />
    );
};

export default TransactionBilledAt;
