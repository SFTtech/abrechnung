import * as React from "react";
import { TextFieldProps } from "@mui/material";
import { DisabledTextField } from "./style/DisabledTextField";
import { parseAbrechnungFloat } from "@abrechnung/utils";

export type NumericInputProps = {
    onChange: (value: number) => void;
    value?: number | undefined;
    isCurrency?: boolean | false;
} & Omit<TextFieldProps, "value" | "onChange" | "onBlur" | "onKeyUp">;

export const NumericInput: React.FC<NumericInputProps> = ({ value, isCurrency, onChange, ...props }) => {
    const [internalValue, setInternalValue] = React.useState("");

    React.useEffect(() => {
        setInternalValue(isCurrency ? (value?.toFixed(2) ?? "") : String(value));
    }, [value, setInternalValue, isCurrency]);

    const onInternalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInternalValue(event.target.value);
        // TODO: validate input
    };

    const propagateChange = () => {
        const parsedValue = parseAbrechnungFloat(internalValue);
        if (!isNaN(parsedValue)) {
            setInternalValue(isCurrency ? parsedValue.toFixed(2) : String(parsedValue));
            onChange(parsedValue);
        }
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
            inputProps={{ inputMode: "decimal" }}
            {...props}
        />
    );
};
