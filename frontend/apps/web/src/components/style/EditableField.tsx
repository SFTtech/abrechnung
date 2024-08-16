import React, { useEffect, useState } from "react";
import { IconButton } from "@mui/material";
import { Check, Close, Edit } from "@mui/icons-material";
import { DisabledTextField } from "./DisabledTextField";

interface Props {
    value: string;
    onChange: (newValue: string) => void;
    validate?: (value: string) => boolean;
    helperText?: string;
    onStopEdit?: () => void;
    canEdit?: boolean;
}

export const EditableField: React.FC<Props> = ({
    value,
    onChange,
    validate = undefined,
    helperText = undefined,
    onStopEdit = undefined,
    canEdit = true,
    ...props
}) => {
    const [currentValue, setValue] = useState("");
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        setValue(value);
    }, [value]);

    const onSave = () => {
        if (!error) {
            onChange(currentValue);
            setValue("");
            setEditing(false);
        }
    };

    const startEditing = () => {
        setValue(value);
        setEditing(true);
    };

    const stopEditing = () => {
        setValue(value);
        setEditing(false);
        if (onStopEdit) {
            onStopEdit();
        }
    };

    const onValueChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValue(event.target.value);
        if (validate) {
            setError(!validate(event.target.value));
        }
    };

    const onKeyUp = (key: React.KeyboardEvent) => {
        if (key.keyCode === 13) {
            onSave();
        }
    };

    return (
        <div style={{ display: "flex", alignItems: "center" }}>
            <DisabledTextField
                error={error}
                value={currentValue}
                disabled={!editing}
                onChange={onValueChange}
                sx={{ flex: 1 }}
                helperText={error ? helperText : null}
                onKeyUp={onKeyUp}
                {...props}
            />
            {canEdit &&
                (editing ? (
                    <>
                        <IconButton color="primary" onClick={onSave}>
                            <Check />
                        </IconButton>
                        <IconButton color="secondary" onClick={stopEditing}>
                            <Close />
                        </IconButton>
                    </>
                ) : (
                    <IconButton color="primary" onClick={startEditing}>
                        <Edit />
                    </IconButton>
                ))}
        </div>
    );
};
