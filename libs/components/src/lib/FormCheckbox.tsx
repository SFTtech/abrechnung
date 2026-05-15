import * as React from "react";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Checkbox, FormControl, FormControlLabel, FormHelperText, CheckboxProps } from "@mui/material";

export type FormCheckboxProps<TFieldValues extends FieldValues = FieldValues> = Omit<
    CheckboxProps,
    "onChange" | "name"
> & {
    label?: string;
    name: Path<TFieldValues>;
    control: Control<TFieldValues>;
};

export const FormCheckbox = <TFieldValues extends FieldValues = FieldValues>({
    name,
    label,
    control,
    sx,
    ...props
}: FormCheckboxProps<TFieldValues>) => {
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
