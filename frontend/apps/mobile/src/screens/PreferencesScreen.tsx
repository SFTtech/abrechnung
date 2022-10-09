import { StyleSheet, View } from "react-native";
import { Button, Divider, Switch, Text } from "react-native-paper";
import * as React from "react";
import { useContext } from "react";
import { useSetRecoilState } from "recoil";
import { authState, logout } from "../core/auth";
import { flushDatabase } from "../core/database";
import { notify } from "../notifications";
import { syncGroups } from "../core/database/groups";
import { PreferencesContext } from "../core/preferences";
import { RootDrawerScreenProps } from "../navigation/types";

export const PreferencesScreen: React.FC<RootDrawerScreenProps<"Preferences">> = () => {
    const setAuth = useSetRecoilState(authState);
    const preferences = useContext(PreferencesContext);

    const onLogout = () => {
        logout()
            .then(() => {
                setAuth({ isLoggedIn: false, isLoading: false });
            })
            .catch((err) => {
                console.log("logout had error", err);
                setAuth({ isLoggedIn: false, isLoading: false });
            });
    };

    const onClearDatabase = () => {
        flushDatabase()
            .then(() => notify({ text: "cleared database" }))
            .catch((err) => notify({ text: `failed to clear database: ${err}` }));
    };

    const onSyncGroups = () => {
        syncGroups().catch((err) =>
            notify({
                text: `Error when syncing groups: ${err}`,
            })
        );
    };

    return (
        <View>
            <View style={styles.toggleSetting}>
                <Text>Dark Theme</Text>
                <Switch value={preferences.isThemeDark} onValueChange={preferences.toggleTheme} />
            </View>
            <Divider />
            <Button onPress={onLogout}>Logout</Button>
            <Button onPress={onClearDatabase}>Clear Database</Button>
            <Button onPress={onSyncGroups}>Reload Groups</Button>
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
