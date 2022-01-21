import React from "react";
import { useState } from "react";
import { useRecoilState } from "recoil";
import { themeSettings, transactionSettings } from "../../recoil/settings";
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
    FormControlLabel,
    FormGroup,
    FormLabel,
    MenuItem,
    Paper,
    Select,
    Switch,
    Typography,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import { clearCache } from "../../recoil/cache";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function Settings() {
    const classes = useStyles();
    const [theme, setTheme] = useRecoilState(themeSettings);
    const [tSettings, setTransactionSettings] = useRecoilState(transactionSettings);

    const [confirmClearCacheOpen, setConfirmClearCacheOpen] = useState(false);

    const handleConfirmClearCacheOpen = () => {
        setConfirmClearCacheOpen(true);
    };

    const handleConfirmClearCacheClose = () => {
        setConfirmClearCacheOpen(false);
    };

    const handleConfirmClearCache = () => {
        clearCache();
        setConfirmClearCacheOpen(false);
        window.location.reload();
    };

    const handleDarkModeChange = (event) => {
        const val = event.target.value;
        setTheme({
            ...theme,
            darkMode: val,
        });
    };

    const handleTransactionShowRemainingChange = (event) => {
        const val = event.target.checked;
        setTransactionSettings({
            ...theme,
            showRemaining: val,
        });
    };

    return (
        <Paper elevation={1} className={classes.paper}>
            <Typography component="h3" variant="h5">
                Settings
            </Typography>
            <Alert sx={{ mt: 1 }} severity="info">
                These settings are stored locally on your device. Clearing your Browser's local storage will reset them.
            </Alert>
            <Box sx={{ mt: 2 }}>
                <FormControl sx={{ width: 200 }}>
                    <FormGroup>
                        <FormLabel component="legend">Theme</FormLabel>
                        <Select
                            id="dark-mode-select"
                            labelId="dark-mode-select-label"
                            value={theme.darkMode}
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
            <Box sx={{ mt: 2 }}>
                <FormControl component="fieldset" variant="standard">
                    <FormLabel component="legend">Transaction Editing</FormLabel>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={tSettings.showRemaining}
                                    onChange={handleTransactionShowRemainingChange}
                                    name="showRemaining"
                                />
                            }
                            label="Show remaining transaction value (rest) when entering transaction positions"
                        />
                    </FormGroup>
                </FormControl>
            </Box>
            <Divider />
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
        </Paper>
    );
}
