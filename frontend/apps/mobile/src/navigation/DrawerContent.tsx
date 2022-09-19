import { DrawerContentScrollView } from "@react-navigation/drawer";
import { StyleSheet, View } from "react-native";
import * as React from "react";
import { ActivityIndicator, Drawer } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { activeGroupIDState, groupState } from "../core/groups";
import { useRecoilState, useRecoilValue } from "recoil";

export default function DrawerContent(props) {
    const navigation = useNavigation();
    const groups = useRecoilValue(groupState);
    const [activeGroupID, setActiveGroupID] = useRecoilState(activeGroupIDState);

    return (
        <DrawerContentScrollView {...props}>
            <View style={styles.drawerContent}>
                <Drawer.Section title="Groups">
                    {groups === null ? (
                        <ActivityIndicator animating={true} />
                    ) : (
                        groups.map((group) => (
                            <Drawer.Item
                                key={group.id}
                                label={group.name}
                                active={group.id === activeGroupID}
                                onPress={() => {
                                    setActiveGroupID(group.id);
                                    navigation.navigate("GroupStackNavigator");
                                }}
                            />
                        ))
                    )}
                </Drawer.Section>
                <Drawer.Section style={styles.drawerSection}>
                    {/*<Drawer.Item*/}
                    {/*    icon={({ color, size }) => (*/}
                    {/*        <MaterialCommunityIcons*/}
                    {/*            name="account-outline"*/}
                    {/*            color={color}*/}
                    {/*            size={size}*/}
                    {/*        />*/}
                    {/*    )}*/}
                    {/*    label="Profile"*/}
                    {/*    onPress={() => {*/}
                    {/*        navigation.navigate("Profile");*/}
                    {/*    }}*/}
                    {/*/>*/}
                    <Drawer.Item
                        icon={({ color, size }) => <MaterialCommunityIcons name="tune" color={color} size={size} />}
                        label="Preferences"
                        onPress={() => {
                            navigation.navigate("Preferences");
                        }}
                    />
                </Drawer.Section>
                {/*<Drawer.Section title="PreferencesScreen">*/}
                {/*    <TouchableRipple*/}
                {/*        onPress={() => {*/}
                {/*        }}*/}
                {/*    >*/}
                {/*        <View style={styles.preference}>*/}
                {/*            <Text>Dark Theme</Text>*/}
                {/*            <View pointerEvents="none">*/}
                {/*                <Switch value={false} />*/}
                {/*            </View>*/}
                {/*        </View>*/}
                {/*    </TouchableRipple>*/}
                {/*    <TouchableRipple*/}
                {/*        onPress={() => {*/}
                {/*        }}*/}
                {/*    >*/}
                {/*        <View style={styles.preference}>*/}
                {/*            <Text>RTL</Text>*/}
                {/*            <View pointerEvents="none">*/}
                {/*                <Switch value={false} />*/}
                {/*            </View>*/}
                {/*        </View>*/}
                {/*    </TouchableRipple>*/}
                {/*</Drawer.Section>*/}
            </View>
        </DrawerContentScrollView>
    );
}

const styles = StyleSheet.create({
    drawerContent: {
        flex: 1,
    },
    row: {
        marginTop: 20,
        flexDirection: "row",
        alignItems: "center",
    },
    section: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 15,
    },
    paragraph: {
        fontWeight: "bold",
        marginRight: 3,
    },
    drawerSection: {
        marginTop: 15,
    },
    preference: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
});
