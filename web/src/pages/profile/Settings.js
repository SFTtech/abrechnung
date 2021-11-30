import React from "react";
import { useRecoilState } from "recoil";
import { themeSettings, transactionSettings } from "../../recoil/settings";
import {
    Alert,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    MenuItem,
    Paper,
    Select,
    Switch,
    Typography
} from "@mui/material";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2)
    }
}));

export default function Settings() {
    const classes = useStyles();
    const [theme, setTheme] = useRecoilState(themeSettings);
    const [tSettings, setTransactionSettings] = useRecoilState(transactionSettings);

    const handleDarkModeChange = (event) => {
        const val = event.target.value;
        setTheme({
            ...theme,
            darkMode: val
        });
    };

    const handleTransactionShowRemainingChange = (event) => {
        const val = event.target.checked;
        setTransactionSettings({
            ...theme,
            showRemaining: val
        });
    };

    return (
        <Paper elevation={1} className={classes.paper}>
            <Typography component="h3" variant="h5">
                Settings
            </Typography>
            <Alert style={{ marginTop: 10 }} severity="info">These settings are locally on your device. Clearing your
                Browser's local storage will reset them.</Alert>
            <div style={{ marginTop: 20 }}>
                <FormControl style={{ width: 200 }}>
                    <FormGroup>
                        <FormLabel component="legend">Theme</FormLabel>
                        {/*<InputLabel id="dark-mode-select-label">Dark Mode</InputLabel>*/}
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
            </div>
            <div style={{ marginTop: 20 }}>
                <FormControl component="fieldset" variant="standard">
                    <FormLabel component="legend">Transaction Editing</FormLabel>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Switch checked={tSettings.showRemaining}
                                        onChange={handleTransactionShowRemainingChange} name="showRemaining" />
                            }
                            label="Show remaining transaction value (rest) when entering transaction positions"
                        />
                    </FormGroup>
                    {/*<FormHelperText>Be careful</FormHelperText>*/}
                </FormControl>
            </div>
        </Paper>
    );
}

