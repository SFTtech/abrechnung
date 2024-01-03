import { MobilePaper } from "@/components/style/mobile";
import { useTitle } from "@/core/utils";
import {
    ThemeMode,
    persistor,
    selectSettingsSlice,
    selectTheme,
    themeChanged,
    useAppDispatch,
    useAppSelector,
} from "@/store";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    FormGroup,
    FormLabel,
    MenuItem,
    Select,
    Stack,
    Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

export const Settings: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const themeMode = useAppSelector((state) => selectTheme({ state: selectSettingsSlice(state) }));

    useTitle(t("profile.settings.tabTitle"));

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
            <Stack spacing={2}>
                <Typography component="h3" variant="h5">
                    {t("profile.settings.pageTitle")}
                </Typography>
                <Alert severity="info">{t("profile.settings.info")}</Alert>
                <Box>
                    <FormControl sx={{ width: 200 }}>
                        <FormGroup>
                            <FormLabel component="legend">{t("profile.settings.theme")}</FormLabel>
                            <Select
                                id="dark-mode-select"
                                labelId="dark-mode-select-label"
                                value={themeMode}
                                label="Dark Mode"
                                variant="standard"
                                onChange={handleDarkModeChange}
                            >
                                <MenuItem value="browser">{t("profile.settings.themeSystemDefault")}</MenuItem>
                                <MenuItem value="dark">{t("profile.settings.themeDarkMode")}</MenuItem>
                                <MenuItem value="light">{t("profile.settings.themeLightMode")}</MenuItem>
                            </Select>
                        </FormGroup>
                    </FormControl>
                </Box>
                <Box>
                    <Button variant="contained" color="error" onClick={handleConfirmClearCacheOpen}>
                        {t("profile.settings.clearCache")}
                    </Button>
                </Box>
            </Stack>

            <Dialog
                open={confirmClearCacheOpen}
                onClose={handleConfirmClearCacheClose}
                aria-labelledby="dialog-confirm-clear-cache"
                aria-describedby="dialog-confirm-clear-cache-description"
            >
                <DialogTitle id="dialog-confirm-clear-cache">{"Clear Cache?"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="dialog-confirm-clear-cache-description">
                        {t("profile.settings.confirmClearCache")}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleConfirmClearCache} autoFocus>
                        {t("common.yes")}
                    </Button>
                    <Button onClick={handleConfirmClearCacheClose}>{t("common.cancel")}</Button>
                </DialogActions>
            </Dialog>
        </MobilePaper>
    );
};
