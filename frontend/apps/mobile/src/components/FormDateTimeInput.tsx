import * as React from "react";
import { Control, Controller } from "react-hook-form";
import { HelperText } from "react-native-paper";
import DateTimeInput, { DateTimeInputProps } from "./DateTimeInput";
import { fromISOStringNullable, toISODateStringNullable } from "@abrechnung/utils";

export type FormDateTimeInputProps = Omit<DateTimeInputProps, "onChange" | "value" | "error"> & {
    name: string;
    control: Control<any, any>;
};

export const FormDateTimeInput: React.FC<FormDateTimeInputProps> = ({ name, control, ...props }) => {
    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
                <>
                    <DateTimeInput
                        value={fromISOStringNullable(value)}
                        onChange={(val) => onChange(toISODateStringNullable(val))}
                        error={!!error}
                        {...props}
                    />
                    {error && <HelperText type="error">{error.message}</HelperText>}
                </>
            )}
        />
    );
};
