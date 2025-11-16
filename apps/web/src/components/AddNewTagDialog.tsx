import * as React from "react";
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from "@mui/material";
import { useTranslation } from "react-i18next";

interface Props {
    open: boolean;
    onCreate: (tagName: string) => void;
    onClose: () => void;
}

export const AddNewTagDialog: React.FC<Props> = ({ open, onCreate, onClose }) => {
    const { t } = useTranslation();
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

    const onKeyUp = (key: React.KeyboardEvent) => {
        if (key.code === "Enter") {
            handleSave();
        }
    };

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = evt.target.value;
        if (newValue !== null && newValue !== "") {
            setError(false);
        }
        setTag(newValue);
    };

    return (
        <Dialog open={open} onClose={handleCloseDialog}>
            <DialogTitle>{t("common.addNewTag")}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    label={t("common.name")}
                    variant="standard"
                    value={tag}
                    error={error}
                    onKeyUp={onKeyUp}
                    helperText={error ? t("common.tagNameRequiredError") : null}
                    onChange={handleChange}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleSave} color="primary">
                    {t("common.save")}
                </Button>
                <Button onClick={handleCloseDialog} color="error">
                    {t("common.cancel")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
