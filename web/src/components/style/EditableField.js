import React, {useEffect, useState} from "react";
import {IconButton} from "@mui/material";
import {Check, Close, Edit} from "@mui/icons-material";
import {makeStyles} from "@mui/styles";
import {DisabledTextField} from "./DisabledTextField";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        alignItems: "center"
    },
    input: {
        flex: 1
    }
}));

export default function EditableField({value, onChange, validate, helperText, onStopEdit, canEdit = true, ...props}) {
    const [currentValue, setValue] = useState("");
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState(false);
    const classes = useStyles();

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

    const onValueChange = (event) => {
        setValue(event.target.value);
        if (validate) {
            setError(!validate(event.target.value));
        }
    };

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            onSave();
        }
    };

    return (
        <div className={classes.root}>
            <DisabledTextField
                error={error}
                value={currentValue}
                disabled={!editing}
                onChange={onValueChange}
                className={classes.input}
                helperText={error ? helperText : null}
                onKeyUp={onKeyUp}
                {...props}
            />
            {canEdit && editing ? (
                <>
                    <IconButton color="primary" onClick={onSave}>
                        <Check/>
                    </IconButton>
                    <IconButton color="secondary" onClick={stopEditing}>
                        <Close/>
                    </IconButton>
                </>
            ) : (
                <IconButton color="primary" onClick={startEditing}>
                    <Edit/>
                </IconButton>
            )}
        </div>
    );
}
