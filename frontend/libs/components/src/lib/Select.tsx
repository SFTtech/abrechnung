import { Checkbox, FormControlProps, Autocomplete, TextField, AutocompleteProps } from "@mui/material";
import * as React from "react";

type OptionType<T, Multiple extends boolean, Nullable extends boolean | undefined> = Nullable extends true | undefined
    ? Multiple extends true
        ? T[] | null
        : T | null
    : Multiple extends true
      ? T[]
      : T;

export type SelectProps<
    Option,
    Multiple extends boolean,
    Nullable extends boolean | undefined,
    DisableClearable extends boolean | undefined,
> = {
    value: OptionType<Option, Multiple, Nullable>;
    options: Option[];
    formatOption: Option extends string ? ((v: Option) => string) | undefined : (v: Option) => string;
    onChange: (value: OptionType<Option, Multiple, Nullable>) => void;
    multiple: Multiple;
    nullable?: Nullable;
    label?: string;
    checkboxes?: boolean;
    chips?: Multiple extends true ? boolean : never;
    variant?: FormControlProps["variant"];
    margin?: FormControlProps["margin"] | "normal";
    helperText?: string;
    error?: boolean;
} & Omit<
    AutocompleteProps<Option, Multiple, DisableClearable, false>,
    "onChange" | "value" | "multiple" | "renderInput" | "getOptionLabel"
>;

export function Select<
    Option,
    Multiple extends boolean,
    Nullable extends boolean | undefined,
    DisableClearable extends boolean | undefined,
>({
    value,
    options,
    label,
    variant,
    margin,
    error,
    nullable,
    checkboxes,
    formatOption,
    multiple,
    chips,
    helperText,
    onChange,
    ...props
}: SelectProps<Option, Multiple, Nullable, DisableClearable>) {
    const handleChange = React.useCallback(
        (event: any, newValue: SelectProps<Option, Multiple, Nullable, DisableClearable>["value"]) => {
            if (!nullable && newValue == null) {
                console.error("tried to set a null value in select even though nullable=false");
                return;
            }
            onChange(newValue as OptionType<Option, Multiple, Nullable>);
        },
        [onChange]
    );

    const optionToString = React.useCallback(
        (option: Option | undefined) => {
            if (option === undefined) {
                return "";
            } else if (typeof option === "string" && formatOption === undefined) {
                return option;
            } else {
                if (!formatOption) {
                    throw new Error("invalid code path, type system should not allow this to happen");
                }
                return formatOption(option);
            }
        },
        [formatOption]
    );

    return (
        <Autocomplete
            multiple={multiple}
            value={value as any}
            onChange={handleChange as any}
            options={options}
            getOptionLabel={optionToString}
            renderOption={({ key, ...props }, option, { selected }) => (
                <li key={key} {...props}>
                    {multiple && checkboxes && <Checkbox checked={selected} />}
                    {optionToString(option)}
                </li>
            )}
            renderInput={(params) => (
                <TextField variant={variant ?? "standard"} label={label} error={error} margin={margin} {...params} />
            )}
            {...props}
        />
    );
}
