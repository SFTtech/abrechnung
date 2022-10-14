import React from "react";
import { useEffect, useState } from "react";
import { TextField } from "@mui/material";

interface Props {
    value: number;
    onChange: (newValue: number) => void;
}

export const ShareInput: React.FC<Props> = ({ value, onChange }) => {
    const [currValue, setValue] = useState("0");
    const [error, setError] = useState(false);

    useEffect(() => {
        setValue(String(value));
        setError(!validate(value));
    }, [value]);

    const onSave = () => {
        if (!error) {
            onChange(parseFloat(currValue));
        }
    };

    const onValueChange = (event) => {
        const val = event.target.value;
        setValue(val);
        setError(!validate(value));
    };

    const validate = (value) => {
        return !(value === null || value === undefined || value === "" || isNaN(parseFloat(value)));
    };

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            onSave();
        }
    };

    return (
        <TextField
            error={error}
            margin="dense"
            variant="standard"
            style={{ width: 40, paddingTop: 1, marginRight: 2 }}
            onBlur={onSave}
            value={currValue}
            onChange={onValueChange}
            helperText={error ? "float required" : null}
            onKeyUp={onKeyUp}
        />
    );
};

export default ShareInput;
