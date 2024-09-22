import * as React from "react";
import { Control, Controller } from "react-hook-form";
import { Checkbox, HelperText, CheckboxItemProps } from "react-native-paper";

export type FormCheckboxProps = Omit<CheckboxItemProps, "onPress" | "status"> & {
    name: string;
    control: Control<any, any>;
};

export const FormCheckbox: React.FC<FormCheckboxProps> = ({ name, control, ...props }) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
                <>
                    <Checkbox.Item
                        status={value ? "checked" : "unchecked"}
                        onPress={() => onChange(!value)}
                        {...props}
                    />
                    {error && <HelperText type="error">{error.message}</HelperText>}
                </>
            )}
        />
    );
};
