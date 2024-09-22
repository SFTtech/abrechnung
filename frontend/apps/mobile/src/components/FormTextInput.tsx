import * as React from "react";
import { Control, Controller } from "react-hook-form";
import { HelperText, TextInput, TextInputProps } from "react-native-paper";

export type FormTextInputProps = Omit<TextInputProps, "onChange" | "value" | "error"> & {
    name: string;
    control: Control<any, any>;
};

export const FormTextInput: React.FC<FormTextInputProps> = ({ name, control, ...props }) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <>
                    <TextInput error={!!error} onChange={onChange} onBlur={onBlur} value={value} {...props} />
                    {error && <HelperText type="error">{error.message}</HelperText>}
                </>
            )}
        />
    );
};
