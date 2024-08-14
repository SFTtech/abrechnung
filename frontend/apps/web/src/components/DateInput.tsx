import { DatePicker } from "@mui/x-date-pickers";
import { DateTime } from "luxon";
import * as React from "react";
import { DisabledTextField } from "./style/DisabledTextField";
import { useTranslation } from "react-i18next";

interface Props {
    value: string;
    onChange: (newValue: string) => void;
    disabled: boolean;
    helperText?: React.ReactNode;
    error?: boolean;
}

export const DateInput: React.FC<Props> = ({ value, onChange, helperText, error, disabled = false }) => {
    const { t } = useTranslation();
    const handleChange = (value: DateTime | null) => {
        const stringified = value?.toISODate();
        if (stringified) {
            onChange(stringified);
        }
    };

    if (disabled) {
        return (
            <DisabledTextField
                label={t("common.date")}
                variant="standard"
                fullWidth
                value={DateTime.fromISO(value).toISODate()}
                disabled={true}
            />
        );
    }

    return (
        <DatePicker
            label={t("common.date")}
            format="yyyy-MM-dd"
            value={DateTime.fromISO(value)}
            onChange={handleChange}
            slotProps={{
                textField: {
                    variant: "standard",
                    margin: "normal",
                    fullWidth: true,
                    helperText,
                    error,
                },
            }}
        />
    );
};
