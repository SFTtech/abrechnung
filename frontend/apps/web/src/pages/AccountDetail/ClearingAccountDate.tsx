import { selectAccountById, wipAccountUpdated } from "@abrechnung/redux";
import { TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { DateTime } from "luxon";
import React, { useState } from "react";
import { selectAccountSlice, useAppDispatch, useAppSelector } from "../../store";
import { DisabledTextField } from "../../components/style/DisabledTextField";

interface Props {
    groupId: number;
    accountId: number;
}

export const ClearingAccountDate: React.FC<Props> = ({ groupId, accountId }) => {
    const [error, setError] = useState(null);

    const dispatch = useAppDispatch();

    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );

    const save = (dateInfo: DateTime) => {
        if (account.type !== "clearing") {
            return;
        }
        if (dateInfo == null) {
            setError("Invalid date format");
            return;
        }
        const formatted = dateInfo.toISODate();
        setError(null);
        if (account.isWip && formatted !== account.dateInfo) {
            dispatch(wipAccountUpdated({ ...account, dateInfo: formatted }));
        }
    };

    if (account.type !== "clearing") {
        return null;
    }

    if (!account.isWip) {
        return (
            <DisabledTextField
                label="Date"
                variant="standard"
                fullWidth
                value={DateTime.fromISO(account.dateInfo).toLocaleString(DateTime.DATE_FULL)}
                disabled={true}
            />
        );
    }

    return (
        <DatePicker
            label="Date"
            inputFormat="yyyy-MM-dd"
            value={DateTime.fromISO(account.dateInfo)}
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

export default ClearingAccountDate;
