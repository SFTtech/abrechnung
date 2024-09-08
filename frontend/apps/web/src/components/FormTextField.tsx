import * as React from "react";
import { Control, Controller } from "react-hook-form";
import { TextField, TextFieldProps } from "@mui/material";

export type FormTextFieldProps = Omit<TextFieldProps, "onChange" | "name"> & {
    name: string;
    control: Control<any, any>;
};

export const FormTextField = ({ name, control, ...props }: FormTextFieldProps) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
                <TextField
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
