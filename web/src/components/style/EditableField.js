import React, {useEffect, useState} from "react";

import {makeStyles} from "@material-ui/core";
import IconButton from "@material-ui/core/IconButton";
import Check from "@material-ui/icons/Check";
import Close from "@material-ui/icons/Close";
import Edit from "@material-ui/icons/Edit";
import TextField from "@material-ui/core/TextField";

const useStyles = makeStyles((theme) => ({
    root: {
        padding: '2px 4px',
        display: 'flex',
        alignItems: 'center',
    },
    input: {
        flex: 1
    }
}));

export default function EditableField({value, onChange, ...props}) {
    const [currentValue, setValue] = useState(null);
    const [editing, setEditing] = useState(false);
    const classes = useStyles();

    useEffect(() => {
        setValue(value);
    }, [value])

    const onSave = () => {
        onChange(currentValue);
        setValue(null);
        setEditing(false);
    }

    const startEditing = () => {
        setValue(value);
        setEditing(true)
    }

    const stopEditing = () => {
        setValue(value);
        setEditing(false);
    }

    return (
        <div className={classes.root}>
            <TextField
                value={currentValue}
                disabled={!editing}
                onChange={event => setValue(event.target.value)}
                className={classes.input}
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
    )
}
