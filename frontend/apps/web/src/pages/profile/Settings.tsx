import React, { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    FormControl,
    FormGroup,
    FormLabel,
    MenuItem,
    Select,
    Typography,
} from "@mui/material";
import { MobilePaper } from "../../components/style/mobile";
import { useTitle } from "../../core/utils";
import {
    useAppDispatch,
    useAppSelector,
    themeChanged,
    selectTheme,
    persistor,
    ThemeMode,
    selectSettingsSlice,
} from "../../store";
import { toast } from "react-toastify";

export const Settings: React.FC = () => {
    const dispatch = useAppDispatch();
    const themeMode = useAppSelector((state) => selectTheme({ state: selectSettingsSlice(state) }));

    useTitle("Abrechnung - Settings");

    const [confirmClearCacheOpen, setConfirmClearCacheOpen] = useState(false);

    const handleConfirmClearCacheOpen = () => {
        setConfirmClearCacheOpen(true);
    };

    const handleConfirmClearCacheClose = () => {
        setConfirmClearCacheOpen(false);
    };

    const handleConfirmClearCache = () => {
        persistor
            .purge()
            .then(() => {
                setConfirmClearCacheOpen(false);
                window.location.reload();
            })
            .catch((err) => toast.error(`Error while clearing cache: ${err}`));
    };

    const handleDarkModeChange = (event) => {
        const val = event.target.value;
        dispatch(themeChanged(val as ThemeMode));
    };

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                Settings
            </Typography>
            <Alert sx={{ mt: 1 }} severity="info">
                These settings are stored locally on your device. Clearing your Browser&aposs local storage will reset
                them.
            </Alert>
            <Box sx={{ mt: 2 }}>
                <FormControl sx={{ width: 200 }}>
                    <FormGroup>
                        <FormLabel component="legend">Theme</FormLabel>
                        <Select
                            id="dark-mode-select"
                            labelId="dark-mode-select-label"
                            value={themeMode}
                            label="Dark Mode"
                            variant="standard"
                            onChange={handleDarkModeChange}
                        >
                            <MenuItem value="browser">System Default</MenuItem>
                            <MenuItem value="dark">Dark Mode</MenuItem>
                            <MenuItem value="light">Light Mode</MenuItem>
                        </Select>
                    </FormGroup>
                </FormControl>
            </Box>
            <Divider sx={{ mt: 1 }} />
            <Box sx={{ mt: 1 }}>
                <FormControl component="fieldset" variant="standard">
                    <FormLabel component="legend">Clear Cache</FormLabel>
                    <FormGroup>
                        <Button variant="contained" color="error" onClick={handleConfirmClearCacheOpen}>
                            Clear
                        </Button>
                    </FormGroup>
                    {/*<FormHelperText>ACHTUNG!</FormHelperText>*/}
                </FormControl>
            </Box>

            <Dialog
                open={confirmClearCacheOpen}
                onClose={handleConfirmClearCacheClose}
                aria-labelledby="dialog-confirm-clear-cache"
                aria-describedby="dialog-confirm-clear-cache-description"
            >
                <DialogTitle id="dialog-confirm-clear-cache">{"Clear Cache?"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="dialog-confirm-clear-cache-description">
                        This action will clear your local cache. All your settings (this page) will not be reset.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleConfirmClearCache} autoFocus>
                        Yes
                    </Button>
                    <Button onClick={handleConfirmClearCacheClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        </MobilePaper>
    );
};

export default Settings;
