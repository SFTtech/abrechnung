import { useApi } from "@/core/ApiProvider";
import { clearCache, logout } from "@abrechnung/redux";
import * as React from "react";
import { View } from "react-native";
import { Dialog, Divider, List, Portal, RadioButton, useTheme } from "react-native-paper";
import { RootDrawerScreenProps } from "../navigation/types";
import { ThemeMode, selectSettingsSlice, selectTheme, themeChanged, useAppDispatch, useAppSelector } from "../store";

const themeModes: ThemeMode[] = ["system", "dark", "light"];

export const PreferencesScreen: React.FC<RootDrawerScreenProps<"Preferences">> = () => {
    const dispatch = useAppDispatch();
    const theme = useTheme();
    const { api } = useApi();
    const themeMode = useAppSelector((state) => selectTheme({ state: selectSettingsSlice(state) }));
    const [themeSelectOpen, setThemeSelectOpen] = React.useState(false);

    const onLogout = () => {
        dispatch(logout({ api }))
            .unwrap()
            .catch((err: Error) => {
                console.error("logout had error", err);
            });
    };

    const onClearCache = () => {
        dispatch(clearCache())
            .unwrap()
            .catch((err: Error) => {
                console.error("clear cache had error", err);
            });
    };

    const openThemeSelect = () => {
        setThemeSelectOpen(true);
    };

    const closeThemeSelect = () => {
        setThemeSelectOpen(false);
    };

    const changeThemeMode = (mode: ThemeMode) => {
        dispatch(themeChanged(mode));
        closeThemeSelect();
    };

    const prettyThemeName = (mode: ThemeMode) => {
        switch (mode) {
            case "dark":
                return "Dark";
            case "light":
                return "Light";
            case "system":
                return "System default";
        }
    };

    return (
        <View>
            <List.Item title="Theme" description={prettyThemeName(themeMode)} onPress={openThemeSelect} />
            <Divider />
            <List.Item title="Clear cache" onPress={onClearCache} titleStyle={{ color: theme.colors.error }} />
            <Divider />
            <List.Item title="Logout" onPress={onLogout} titleStyle={{ color: theme.colors.error }} />
            <Divider />
            <Portal>
                <Dialog visible={themeSelectOpen} onDismiss={closeThemeSelect}>
                    <Dialog.Title>Theme</Dialog.Title>
                    <Dialog.Content>
                        <RadioButton.Group
                            value={themeMode}
                            onValueChange={(value) => changeThemeMode(value as ThemeMode)}
                        >
                            {themeModes.map((m) => (
                                <RadioButton.Item key={m} label={prettyThemeName(m)} value={m} />
                            ))}
                        </RadioButton.Group>
                    </Dialog.Content>
                </Dialog>
            </Portal>
        </View>
    );
};

export default PreferencesScreen;
