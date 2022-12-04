import { DrawerContentScrollView } from "@react-navigation/drawer";
import { StyleSheet, View, ScrollView, ScrollViewProps } from "react-native";
import * as React from "react";
import { ActivityIndicator, Drawer, IconButton, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
    useAppSelector,
    selectGroupSlice,
    selectUiSlice,
    selectActiveGroupId,
    useAppDispatch,
    changeActiveGroup,
} from "../store";
import { selectGroups } from "@abrechnung/redux";
import { api } from "../core/api";

type Props = React.ForwardRefExoticComponent<ScrollViewProps & React.RefAttributes<ScrollView>>;

export const DrawerContent: React.FC<Props> = (props) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const navigation = useNavigation();
    const activeGroupID = useAppSelector((state) => selectActiveGroupId({ state: selectUiSlice(state) }));
    const groups = useAppSelector((state) => selectGroups({ state: selectGroupSlice(state) }));

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
                                    dispatch(changeActiveGroup({ api, groupId: group.id }))
                                        .unwrap()
                                        .then(() => {
                                            navigation.navigate("GroupStackNavigator", {
                                                screen: "TransactionList",
                                                params: { groupId: group.id },
                                            });
                                        });
                                }}
                            />
                        ))
                    )}
                    <IconButton
                        icon="add"
                        containerColor={theme.colors.primaryContainer}
                        style={styles.addGroupButton}
                        size={32}
                        mode="contained"
                        onPress={() => navigation.navigate("AddGroup")}
                    />
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
            </View>
        </DrawerContentScrollView>
    );
};

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
    addGroupButton: {
        position: "absolute",
        right: 16,
        bottom: -30,
        zIndex: 100,
    },
});

export default DrawerContent;
