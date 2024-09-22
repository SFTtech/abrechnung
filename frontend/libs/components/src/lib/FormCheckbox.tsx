import * as React from "react";
import { Control, Controller } from "react-hook-form";
import { Checkbox, FormControl, FormControlLabel, FormHelperText, CheckboxProps } from "@mui/material";

export type FormCheckboxProps = Omit<CheckboxProps, "onChange" | "name"> & {
    label?: string;
    name: string;
    control: Control<any, any>;
};

export const FormCheckbox = ({ name, label, control, sx, ...props }: FormCheckboxProps) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
                <FormControl error={!!error} sx={sx}>
                    <FormControlLabel
                        label={label}
                        control={<Checkbox checked={value} onChange={onChange} {...props} />}
                    />
                    {error && <FormHelperText>error.message</FormHelperText>}
                </FormControl>
            )}
        />
    );
};
