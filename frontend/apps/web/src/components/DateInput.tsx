import * as React from "react";
import { TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { DateTime } from "luxon";
import { DisabledTextField } from "./style/DisabledTextField";

interface Props {
    value: string;
    onChange: (newValue: string) => void;
    disabled: boolean;
    helperText?: React.ReactNode;
    error?: boolean;
}

export const DateInput: React.FC<Props> = ({ value, onChange, helperText, error, disabled = false }) => {
    const handleChange = (value: DateTime) => {
        if (value.toISODate()) {
            onChange(value.toISODate());
        }
    };

    if (disabled) {
        return (
            <DisabledTextField
                label="Date"
                variant="standard"
                fullWidth
                value={DateTime.fromISO(value).toISODate()}
                disabled={true}
            />
        );
    }

    return (
        <DatePicker
            label="Date"
            inputFormat="yyyy-MM-dd"
            value={DateTime.fromISO(value)}
            onChange={handleChange}
            renderInput={(params) => (
                <TextField
                    variant="standard"
                    margin="normal"
                    fullWidth
                    {...params}
                    helperText={helperText}
                    error={error}
                />
            )}
        />
    );
};
