import { HelperText, TextInput } from "react-native-paper";
import React from "react";
import { useEffect, useState } from "react";
import { DateTimePickerAndroid, DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { toISODateString } from "@abrechnung/utils";

interface Props
    extends Omit<React.ComponentProps<typeof TextInput>, "onChange" | "value" | "disabled" | "editable" | "mode"> {
    value: Date | null;
    onChange: (newValue: Date) => void;
    mode?: "time" | "date";
    disabled?: boolean;
    editable?: boolean;
}

export const DateTimeInput: React.FC<Props> = ({
    value,
    onChange,
    mode = "date",
    disabled = false,
    editable = false,
    ...props
}) => {
    const [textValue, setTextValue] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setTextValue(value === null ? "" : toISODateString(value));
    }, [value, setTextValue]);

    const onTextInputChange = (newValue: string) => {
        if (!disabled && editable) {
            setTextValue(newValue);
        }
    };

    const onPickerChange = (event: DateTimePickerEvent, selectedDate: Date | undefined) => {
        if (!disabled && editable && selectedDate) {
            propagateChange(selectedDate);
        }
    };

    const onInputChange = () => {
        const parsedDate = Date.parse(textValue);
        if (parsedDate != null && !isNaN(parsedDate)) {
            setError(null);
            propagateChange(new Date(parsedDate));
        } else {
            setError("invalid date");
        }
    };

    const propagateChange = (val: Date) => {
        onChange(val);
    };

    const show = () => {
        if (!disabled && editable) {
            DateTimePickerAndroid.open({
                value: value ?? new Date(),
                onChange: onPickerChange,
                mode: mode,
                is24Hour: true,
            });
        }
    };

    return (
        <>
            <TextInput
                onChange={() => null}
                value={textValue} // TODO: proper input validation
                onChangeText={onTextInputChange} // TODO: fix date input with keyboard
                onEndEditing={onInputChange}
                disabled={disabled}
                editable={editable}
                right={
                    disabled || !editable ? undefined : (
                        <TextInput.Icon onPress={show} icon="calendar-today" forceTextInputFocus={false} />
                    )
                }
                error={error !== null}
                {...props}
            />
            {!!error && <HelperText type="error">{error}</HelperText>}
        </>
    );
};

export default DateTimeInput;
