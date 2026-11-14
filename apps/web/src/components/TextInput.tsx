import * as React from "react";
import { TextFieldProps } from "@mui/material";
import { DisabledTextField, useOnChange } from "@abrechnung/components";

export type TextInputProps = {
    onChange: (value: string) => void;
    value?: string | undefined;
} & Omit<TextFieldProps, "value" | "onChange" | "onBlur" | "onKeyUp">;

export const TextInput: React.FC<TextInputProps> = ({ value, onChange, ...props }) => {
    const [internalValue, setInternalValue] = React.useState("");

    useOnChange([value], () => {
        setInternalValue(String(value));
    });

    const onInternalChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setInternalValue(event.target.value);
    };

    const propagateChange = () => {
        onChange(internalValue);
    };

    const onInternalBlur = () => {
        propagateChange();
    };

    const onKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter") {
            propagateChange();
        }
    };

    return (
        <DisabledTextField
            value={internalValue}
            onChange={onInternalChange}
            onBlur={onInternalBlur}
            onKeyUp={onKeyUp}
            variant="standard"
            {...props}
        />
    );
};
