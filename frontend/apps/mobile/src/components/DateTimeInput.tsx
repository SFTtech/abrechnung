import { HelperText, TextInput, TextInputProps } from "react-native-paper";
import React from "react";
import { useEffect, useState } from "react";
import { DateTimePickerAndroid, DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { toISODateString } from "@abrechnung/utils";

interface Props {
    value: Date;
    onChange: (newValue: Date) => void;
    mode: "time" | "date";
    disabled?: boolean;
    editable?: boolean;
}

export const DateTimeInput: React.FC<Props> = ({
    value,
    onChange,
    mode,
    disabled = false,
    editable = false,
    ...props
}) => {
    const [textValue, setTextValue] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setTextValue(toISODateString(value));
    }, [value, setTextValue]);

    const onTextInputChange = (newValue: string) => {
        setTextValue(newValue);
    };

    const onPickerChange = (event: DateTimePickerEvent, selectedDate: Date | undefined) => {
        if (selectedDate) {
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
                value: value,
                onChange: onPickerChange,
                mode: mode,
                is24Hour: true,
            });
        }
    };

    return (
        <>
            <TextInput
                {...props}
                onChange={() => null}
                value={textValue} // TODO: proper input validation
                onChangeText={onTextInputChange} // TODO: fix date input with keyboard
                onEndEditing={onInputChange}
                right={<TextInput.Icon onPress={show} name="calendar-today" />}
                error={error !== null}
            />
            {!!error && <HelperText type="error">{error}</HelperText>}
        </>
    );
};

export default DateTimeInput;
