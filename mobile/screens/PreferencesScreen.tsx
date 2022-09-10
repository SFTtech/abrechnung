import { View } from "react-native";
import { Button, Text } from "react-native-paper";
import * as React from "react";
import { useRecoilState } from "recoil";
import { authState, logout } from "../core/auth";
import { flushDatabase } from "../core/database";
import { notify } from "../notifications";
import { syncGroups } from "../core/database/groups";

export default function PreferencesScreen() {
    const [auth, setAuth] = useRecoilState(authState);

    const onLogout = () => {
        logout()
            .then(() => {
                setAuth({ isLoggedIn: false, isLoading: false });
            })
            .catch(err => {
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
        syncGroups().catch(err => notify({
            text: `Error when syncing groups: ${err}`,
        }));
    };

    return (
        <View>
            <Button onPress={onLogout}>Logout</Button>
            <Button onPress={onClearDatabase}>Clear Database</Button>
            <Button onPress={onSyncGroups}>Reload Groups</Button>
            <Text>Preferences</Text>
        </View>
    );
}