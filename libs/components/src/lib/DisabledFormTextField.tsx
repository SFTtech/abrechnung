import * as React from "react";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { TextFieldProps } from "@mui/material";
import { DisabledTextField } from "./DisabledTextField";

export type DisabledFormTextFieldProps<TFieldValues extends FieldValues = FieldValues> = Omit<
    TextFieldProps,
    "onChange" | "name"
> & {
    name: Path<TFieldValues>;
    control: Control<TFieldValues>;
};

export const DisabledFormTextField = <TFieldValues extends FieldValues = FieldValues>({
    name,
    control,
    ...props
}: DisabledFormTextFieldProps<TFieldValues>) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
                <DisabledTextField
                    helperText={error ? error.message : null}
                    error={!!error}
                    onChange={onChange}
                    value={value}
                    {...props}
                />
            )}
        />
    );
};
