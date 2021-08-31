import React, {useEffect, useState} from "react";

import {makeStyles} from "@material-ui/core";
import IconButton from "@material-ui/core/IconButton";
import Check from "@material-ui/icons/Check";
import Close from "@material-ui/icons/Close";
import Edit from "@material-ui/icons/Edit";
import DisabledTextField from "./DisabledTextField";

const useStyles = makeStyles((theme) => ({
    root: {
        padding: "2px 4px",
        display: "flex",
        alignItems: "center"
    },
    input: {
        flex: 1
    }
}));

export default function EditableField({value, onChange, validate, helperText, onStopEdit, ...props}) {
    const [currentValue, setValue] = useState(null);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState(false);
    const classes = useStyles();

    useEffect(() => {
        setValue(value);
    }, [value]);

    const onSave = () => {
        if (!error) {
            console.log("on save current value: ", {value: currentValue});
            onChange(currentValue);
            setValue(null);
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
            {editing ? (
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
