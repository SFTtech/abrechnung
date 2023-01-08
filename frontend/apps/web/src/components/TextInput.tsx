import * as React from "react";
import { TextFieldProps } from "@mui/material";
import { DisabledTextField } from "./style/DisabledTextField";

export type TextInputProps = {
    onChange: (value: string) => void;
    value?: string | undefined;
} & Omit<TextFieldProps, "value" | "onChange" | "onBlur" | "onKeyUp">;

export const TextInput: React.FC<TextInputProps> = ({ value, onChange, ...props }) => {
    const [internalValue, setInternalValue] = React.useState("");

    React.useEffect(() => {
        setInternalValue(String(value));
    }, [value, setInternalValue]);

    const onInternalChange = (event) => {
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
