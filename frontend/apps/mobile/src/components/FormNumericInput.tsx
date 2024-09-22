import * as React from "react";
import { Control, Controller } from "react-hook-form";
import { HelperText } from "react-native-paper";
import { NumericInput, NumericInputProps } from "./NumericInput";

export type FormNumericInput = Omit<NumericInputProps, "onChange" | "value" | "error"> & {
    name: string;
    control: Control<any, any>;
};

export const FormNumericInput: React.FC<FormNumericInput> = ({ name, control, ...props }) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <>
                    <NumericInput error={!!error} onChange={onChange} onBlur={onBlur} value={value} {...props} />
                    {error && <HelperText type="error">{error.message}</HelperText>}
                </>
            )}
        />
    );
};
