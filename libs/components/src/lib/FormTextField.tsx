import * as React from "react";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { TextField, TextFieldProps } from "@mui/material";

export type FormTextFieldProps<TFieldValues extends FieldValues = FieldValues> = Omit<
    TextFieldProps,
    "onChange" | "name"
> & {
    name: Path<TFieldValues>;
    control: Control<TFieldValues>;
};

export const FormTextField = <TFieldValues extends FieldValues = FieldValues>({
    name,
    control,
    ...props
}: FormTextFieldProps<TFieldValues>) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <TextField
                    helperText={error ? error.message : null}
                    error={!!error}
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    {...props}
                />
            )}
        />
    );
};
