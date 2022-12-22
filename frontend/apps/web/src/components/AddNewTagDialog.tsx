import * as React from "react";
import {
    Box,
    Chip,
    MenuItem,
    Checkbox,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    TextField,
    DialogActions,
    Button,
} from "@mui/material";

interface Props {
    open: boolean;
    onCreate: (tagName: string) => void;
    onClose: () => void;
}

export const AddNewTagDialog: React.FC<Props> = ({ open, onCreate, onClose }) => {
    const [tag, setTag] = React.useState("");
    const [error, setError] = React.useState(false);

    const handleCloseDialog = () => {
        onClose();
        setTag("");
    };

    const handleSave = () => {
        if (tag == null || tag === "") {
            setError(true);
            return;
        }

        onCreate(tag);
        setTag("");
        setError(false);
    };

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            handleSave();
        }
    };

    const handleChange = (evt) => {
        const newValue = evt.target.value;
        if (newValue !== null && newValue !== "") {
            setError(false);
        }
        setTag(newValue);
    };

    return (
        <Dialog open={open} onClose={handleCloseDialog}>
            <DialogTitle>Add new tag</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    label="Tag name"
                    variant="standard"
                    value={tag}
                    error={error}
                    onKeyUp={onKeyUp}
                    helperText={error ? "please input a tag name" : null}
                    onChange={handleChange}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleSave} color="primary">
                    Save
                </Button>
                <Button onClick={handleCloseDialog} color="error">
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
};
