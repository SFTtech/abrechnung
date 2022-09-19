import { HelperText, TextInput } from "react-native-paper";
import * as React from "react";
import { useEffect, useState } from "react";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { toISODateString } from "@abrechnung/utils";

export default function DateTimeInput(props) {
    const { value, onChange, mode, disabled = false, editable = true } = props;

    const [textValue, setTextValue] = useState("");
    const [error, setError] = useState(null);

    useEffect(() => {
        setTextValue(toISODateString(value));
    }, [value, setTextValue]);

    const onTextInputChange = (newValue: string) => {
        setTextValue(newValue);
    };

    const onPickerChange = (event, selectedDate: Date) => {
        propagateChange(selectedDate);
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
                onChange={null}
                value={textValue} // TODO: proper input validation
                onChangeText={onTextInputChange} // TODO: fix date input with keyboard
                onEndEditing={onInputChange}
                right={<TextInput.Icon onPress={show} name="calendar-today" />}
                error={error !== null}
            />
            {!!error && <HelperText type="error">{error}</HelperText>}
        </>
    );
}
