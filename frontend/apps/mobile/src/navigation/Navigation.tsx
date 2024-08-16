import { fetchGroupDependencies, selectGroups, selectIsAuthenticated, subscribe, unsubscribe } from "@abrechnung/redux";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import * as React from "react";
import { useEffect } from "react";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { clearingAccountIcon, personalAccountIcon } from "../constants/Icons";
import { useOptionalApi } from "../core/ApiProvider";
import { notify } from "../notifications";
import { AddGroup } from "../screens/AddGroup";
import { GroupList } from "../screens/GroupList";
import { HomeScreen } from "../screens/HomeScreen";
import { LoginScreen } from "../screens/Login";
import { PreferencesScreen } from "../screens/PreferencesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RegisterScreen } from "../screens/Register";
import { SplashScreen } from "../screens/SplashScreen";
import { TransactionList } from "../screens/TransactionList";
import { AccountDetail } from "../screens/groups/AccountDetail";
import { AccountEdit } from "../screens/groups/AccountEdit";
import { AccountList } from "../screens/groups/AccountList";
import { TransactionDetail } from "../screens/groups/TransactionDetail";
import {
    changeActiveGroup,
    selectActiveGroupId,
    selectAuthSlice,
    selectGroupSlice,
    selectUiSlice,
    useAppDispatch,
    useAppSelector,
} from "../store";
import { Theme } from "../theme";
import { DrawerContent } from "./DrawerContent";
import { Header } from "./Header";
import { linkingOptions } from "./LinkingConfiguration";
import { GroupStackParamList, GroupTabParamList, RootDrawerParamList } from "./types";

export const Navigation: React.FC<{ theme: Theme }> = ({ theme }) => {
    return (
        <NavigationContainer linking={linkingOptions} theme={theme}>
            <RootNavigator />
        </NavigationContainer>
    );
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

const RootNavigator: React.FC = () => {
    const { api, websocket } = useOptionalApi();
    const dispatch = useAppDispatch();
    const activeGroupId = useAppSelector((state) => selectActiveGroupId({ state: selectUiSlice(state) }));
    const groups = useAppSelector((state) => selectGroups({ state: selectGroupSlice(state) }));
    const isAuthenticated = useAppSelector((state) => selectIsAuthenticated({ state: selectAuthSlice(state) }));

    useEffect(() => {
        if (!isAuthenticated || !api) {
            return;
        }

        if (activeGroupId === undefined && groups.length > 0) {
            dispatch(changeActiveGroup({ groupId: groups[0].id, api }))
                .unwrap()
                .catch((err: Error) => {
                    console.error("Error changing active group", err);
                    notify({ text: "error while changing selective group" });
                });
        } else if (activeGroupId !== undefined) {
            dispatch(fetchGroupDependencies({ groupId: activeGroupId, api, fetchAnyway: true }))
                .unwrap()
                .catch((err: Error) => {
                    console.error("Error updating group content", err);
                    notify({ text: "error while updating group content" });
                });
        }
    }, [api, isAuthenticated, dispatch, activeGroupId, groups]);

    useEffect(() => {
        if (!isAuthenticated || activeGroupId === undefined || !websocket) {
            return;
        }
        dispatch(subscribe({ subscription: { type: "transaction", groupId: activeGroupId }, websocket }));
        dispatch(subscribe({ subscription: { type: "account", groupId: activeGroupId }, websocket }));
        dispatch(subscribe({ subscription: { type: "group_member", groupId: activeGroupId }, websocket }));

        return () => {
            dispatch(unsubscribe({ subscription: { type: "transaction", groupId: activeGroupId }, websocket }));
            dispatch(unsubscribe({ subscription: { type: "account", groupId: activeGroupId }, websocket }));
            dispatch(unsubscribe({ subscription: { type: "group_member", groupId: activeGroupId }, websocket }));
        };
    }, [websocket, isAuthenticated, activeGroupId, dispatch]);

    const propsWithHeader = {
        headerShown: true,
        header: (props) => <Header {...props} />,
    };

    const initialRoutName = isAuthenticated
        ? activeGroupId === undefined
            ? "GroupList"
            : "GroupStackNavigator"
        : "Login";

    return (
        <Drawer.Navigator
            id="Drawer"
            initialRouteName={initialRoutName}
            drawerContent={(props) => <DrawerContent {...props} />}
            screenOptions={{ headerShown: false }}
        >
            {isAuthenticated ? (
                <>
                    <Drawer.Screen
                        name="GroupList"
                        options={{ ...propsWithHeader, headerTitle: "Groups" }}
                        component={GroupList}
                    />
                    <Drawer.Screen name="GroupStackNavigator" component={GroupStackNavigator} />
                    <Drawer.Screen
                        name="Home"
                        options={{ ...propsWithHeader, headerTitle: "Home" }}
                        component={HomeScreen}
                    />
                    <Drawer.Screen
                        name="Preferences"
                        options={{ ...propsWithHeader, headerTitle: "Preferences" }}
                        component={PreferencesScreen}
                    />
                    <Drawer.Screen
                        name="Profile"
                        options={{ ...propsWithHeader, headerTitle: "Profile" }}
                        component={ProfileScreen}
                    />
                </>
            ) : (
                <>
                    <Drawer.Screen name="Login" component={LoginScreen} options={{ headerTitle: "Login" }} />
                    <Drawer.Screen name="Register" component={RegisterScreen} options={{ headerTitle: "Register" }} />
                </>
            )}
        </Drawer.Navigator>
    );
};

const GroupStack = createStackNavigator<GroupStackParamList>();

const GroupStackNavigator = () => {
    const groupId = useAppSelector((state) => selectActiveGroupId({ state: selectUiSlice(state) }));

    return (
        <GroupStack.Navigator
            id="GroupStack"
            initialRouteName="BottomTabNavigator"
            screenOptions={{
                header: (props) => <Header {...props} />,
            }}
        >
            <GroupStack.Screen name="BottomTabNavigator" component={BottomTabNavigator} />
            <GroupStack.Screen name="AddGroup" options={{ headerTitle: "Add Group" }} component={AddGroup} />
            <GroupStack.Screen
                name="TransactionDetail"
                component={TransactionDetail}
                options={{ headerTitle: "Transaction Detail" }}
                initialParams={{ groupId }}
            />
            <GroupStack.Screen name="AccountDetail" component={AccountDetail} initialParams={{ groupId }} />
            <GroupStack.Screen name="AccountEdit" component={AccountEdit} initialParams={{ groupId }} />
        </GroupStack.Navigator>
    );
};

const BottomTab = createMaterialTopTabNavigator<GroupTabParamList>();

const BottomTabNavigator: React.FC = () => {
    const activeGroupID = useAppSelector((state) => selectActiveGroupId({ state: selectUiSlice(state) }));

    return (
        <BottomTab.Navigator id="BottomTab" initialRouteName="TransactionList" tabBarPosition="bottom">
            <BottomTab.Screen
                name="TransactionList"
                component={activeGroupID == null ? SplashScreen : TransactionList}
                options={{
                    tabBarLabel: "Transactions",
                    tabBarIcon: ({ color }) => <TabBarIcon name="euro" color={color} />,
                }}
            />
            <BottomTab.Screen
                name="AccountList"
                component={activeGroupID == null ? SplashScreen : AccountList}
                options={{
                    tabBarLabel: "People",
                    tabBarIcon: ({ color }) => <TabBarIcon name={personalAccountIcon} color={color} />,
                }}
            />
            <BottomTab.Screen
                name="ClearingAccountList"
                component={activeGroupID == null ? SplashScreen : AccountList}
                options={{
                    tabBarLabel: "Events",
                    tabBarIcon: ({ color }) => <TabBarIcon name={clearingAccountIcon} color={color} />,
                }}
            />
        </BottomTab.Navigator>
    );
};

/**
 * You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
 */
interface TabBarIconProps {
    name: React.ComponentProps<typeof MaterialIcons>["name"];
    color: string;
}
const TabBarIcon: React.FC<TabBarIconProps> = (props) => {
    return <MaterialIcons size={22} style={{ marginBottom: -3 }} {...props} />;
};
