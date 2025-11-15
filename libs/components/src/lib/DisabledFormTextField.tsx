import * as React from "react";
import { Control, Controller } from "react-hook-form";
import { TextFieldProps } from "@mui/material";
import { DisabledTextField } from "./DisabledTextField";

export type DisabledFormTextFieldProps = Omit<TextFieldProps, "onChange" | "name"> & {
    name: string;
    control: Control<any, any>;
};

export const DisabledFormTextField = ({ name, control, ...props }: DisabledFormTextFieldProps) => {
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
