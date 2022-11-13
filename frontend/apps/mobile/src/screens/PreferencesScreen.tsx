import { StyleSheet, View } from "react-native";
import { Button, Divider, Text, Menu } from "react-native-paper";
import * as React from "react";
import { notify } from "../notifications";
import { RootDrawerScreenProps } from "../navigation/types";
import {
    useAppDispatch,
    useAppSelector,
    selectTheme,
    selectSettingsSlice,
    persistor,
    ThemeMode,
    themeChanged,
} from "../store";
import { logout } from "@abrechnung/redux";
import { api } from "../core/api";

export const PreferencesScreen: React.FC<RootDrawerScreenProps<"Preferences">> = () => {
    const dispatch = useAppDispatch();
    const themeMode = useAppSelector((state) => selectTheme({ state: selectSettingsSlice(state) }));
    const [themeSelectOpen, setThemeSelectOpen] = React.useState(false);

    const onLogout = () => {
        dispatch(logout({ api }))
            .unwrap()
            .catch((err: Error) => {
                console.error("logout had error", err);
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

    return (
        <View>
            <View style={styles.toggleSetting}>
                <Text>Dark Theme</Text>
                <Menu
                    visible={themeSelectOpen}
                    onDismiss={closeThemeSelect}
                    anchor={<Button onPress={openThemeSelect}>{themeMode}</Button>}
                >
                    <Menu.Item
                        onPress={() => {
                            changeThemeMode("dark");
                        }}
                        title="Dark Mode"
                    />
                    <Menu.Item
                        onPress={() => {
                            changeThemeMode("light");
                        }}
                        title="Light Mode"
                    />
                    <Menu.Item
                        onPress={() => {
                            changeThemeMode("system");
                        }}
                        title="Use System Settings"
                    />
                </Menu>
            </View>
            <Divider />
            <Button onPress={onLogout}>Logout</Button>
        </View>
    );
};

const styles = StyleSheet.create({
    toggleSetting: {
        paddingRight: 30,
        paddingLeft: 30,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
});

export default PreferencesScreen;
