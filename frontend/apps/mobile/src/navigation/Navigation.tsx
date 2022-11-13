/**
 * If you are not familiar with React Navigation, refer to the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import { MaterialIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import * as React from "react";
import { useEffect } from "react";
import { GroupStackParamList, GroupTabParamList, RootDrawerParamList } from "./types";
import { linkingOptions } from "./LinkingConfiguration";
import { createDrawerNavigator } from "@react-navigation/drawer";
import TransactionList from "../screens/groups/TransactionList";
import AccountList from "../screens/groups/AccountList";
import TransactionDetail from "../screens/groups/TransactionDetail";
import LoginScreen from "../screens/Login";
import RegisterScreen from "../screens/Register";
import { MD3Theme } from "react-native-paper";
import AccountDetail from "../screens/groups/AccountDetail";
import DrawerContent from "./DrawerContent";
import { Header } from "./Header";
import HomeScreen from "../screens/HomeScreen";
import { SplashScreen } from "../screens/SplashScreen";
import {
    useAppSelector,
    selectGroupSlice,
    selectAuthSlice,
    useAppDispatch,
    selectUiSlice,
    selectActiveGroupId,
    changeActiveGroup,
    fetchGroupDependencies,
} from "../store";
import { selectGroups, selectIsAuthenticated, subscribe, unsubscribe } from "@abrechnung/redux";
import { clearingAccountIcon, personalAccountIcon } from "../constants/Icons";
import PreferencesScreen from "../screens/PreferencesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AccountEdit from "../screens/groups/AccountEdit";
import { api, websocket } from "../core/api";
import { notify } from "../notifications";
import { GroupList } from "../screens/GroupList";

export const Navigation: React.FC<{ theme: MD3Theme }> = ({ theme }) => {
    return (
        <NavigationContainer linking={linkingOptions} theme={theme}>
            <RootNavigator />
        </NavigationContainer>
    );
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

const RootNavigator: React.FC = () => {
    const dispatch = useAppDispatch();
    const activeGroupId = useAppSelector((state) => selectActiveGroupId({ state: selectUiSlice(state) }));
    const groups = useAppSelector((state) => selectGroups({ state: selectGroupSlice(state) }));
    const isAuthenticated = useAppSelector((state) => selectIsAuthenticated({ state: selectAuthSlice(state) }));

    useEffect(() => {
        if (activeGroupId === undefined && groups.length > 0) {
            dispatch(changeActiveGroup({ groupId: groups[0].id, api }))
                .unwrap()
                .then(() => {
                    notify({ text: "error while changing selective group" });
                });
        } else if (activeGroupId !== undefined) {
            dispatch(fetchGroupDependencies({ groupId: activeGroupId, api }));
        }
    }, [dispatch, activeGroupId, groups]);

    useEffect(() => {
        if (activeGroupId === undefined) {
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
    }, [activeGroupId, dispatch]);

    const propsWithHeader = {
        headerShown: true,
        header: (props) => <Header {...props} />,
    };

    return (
        <Drawer.Navigator
            id="Drawer"
            initialRouteName={activeGroupId === undefined ? "GroupList" : "GroupStackNavigator"}
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
                    <Drawer.Screen
                        name="GroupStackNavigator"
                        component={activeGroupId === undefined ? SplashScreen : GroupStackNavigator}
                    />
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
                <Drawer.Group>
                    <Drawer.Screen name="Login" component={LoginScreen} options={{ headerTitle: "Login" }} />
                    <Drawer.Screen name="Register" component={RegisterScreen} options={{ headerTitle: "Register" }} />
                </Drawer.Group>
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

const BottomTab = createBottomTabNavigator<GroupTabParamList>();

const BottomTabNavigator: React.FC = () => {
    const activeGroupID = useAppSelector((state) => selectActiveGroupId({ state: selectUiSlice(state) }));

    return (
        <BottomTab.Navigator
            id="BottomTab"
            initialRouteName="TransactionList"
            screenOptions={{
                // tabBarActiveTintColor: Colors[colorScheme].tint,
                headerShown: false,
            }}
        >
            <BottomTab.Screen
                name="TransactionList"
                component={activeGroupID == null ? SplashScreen : TransactionList}
                options={{
                    title: "Transactions",
                    tabBarIcon: ({ color }) => <TabBarIcon name="euro" color={color} />,
                }}
            />
            <BottomTab.Screen
                name="AccountList"
                component={activeGroupID == null ? SplashScreen : AccountList}
                options={{
                    title: "People",
                    tabBarIcon: ({ color }) => <TabBarIcon name={personalAccountIcon} color={color} />,
                }}
            />
            <BottomTab.Screen
                name="ClearingAccountList"
                component={activeGroupID == null ? SplashScreen : AccountList}
                options={{
                    title: "Events",
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
    return <MaterialIcons size={30} style={{ marginBottom: -3 }} {...props} />;
};
