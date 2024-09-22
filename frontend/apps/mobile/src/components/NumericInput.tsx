import React from "react";
import { TextInput } from "react-native-paper";
import { parseAbrechnungFloat } from "@abrechnung/utils";

export type NumericInputProps = Omit<React.ComponentProps<typeof TextInput>, "onChange" | "value"> & {
    value: number;
    onChange: (newValue: number) => void;
};

export const NumericInput: React.FC<NumericInputProps> = ({ value, onChange, ...props }) => {
    const [internalValue, setInternalValue] = React.useState("");
    const { editable } = props;

    React.useEffect(() => {
        setInternalValue(editable ? String(value) : String(value.toFixed(2)));
    }, [editable, value, setInternalValue]);

    const onInternalChange = (newValue: string) => {
        setInternalValue(newValue);
        const num = parseAbrechnungFloat(newValue);
        if (!isNaN(num)) {
            onChange(num);
        }
    };

    return <TextInput value={internalValue} onChangeText={onInternalChange} {...props} />;
};
