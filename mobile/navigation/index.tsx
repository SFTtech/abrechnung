/**
 * If you are not familiar with React Navigation, refer to the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import { MaterialIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute, NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import * as React from "react";
import { useEffect } from "react";
import { GroupStackParamList, GroupTabParamList, RootDrawerParamList } from "../types";
import LinkingConfiguration from "./LinkingConfiguration";
import { createDrawerNavigator } from "@react-navigation/drawer";
import TransactionList from "../screens/groups/TransactionList";
import AccountList from "../screens/groups/AccountList";
import TransactionDetail from "../screens/groups/TransactionDetail";
import { CHILD_STATE } from "@react-navigation/core/src/useRouteCache";
import { Route } from "@react-navigation/routers";
import LoginScreen from "../screens/Login";
import RegisterScreen from "../screens/Register";
import { Theme } from "react-native-paper";
import AccountDetail from "../screens/groups/AccountDetail";
import DrawerContent from "./DrawerContent";
import Header from "./Header";
import HomeScreen from "../screens/HomeScreen";
import { authState } from "../core/auth";
import { useRecoilState, useRecoilValue } from "recoil";
import SplashScreen from "../screens/SplashScreen";
import { syncLocalGroupState, syncLocalState } from "../core/sync";
import { notify } from "../notifications";
import { activeGroupIDState, groupState } from "../core/groups";
import { clearingAccountIcon, personalAccountIcon } from "../constants/Icons";
import PreferencesScreen from "../screens/PreferencesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AccountEdit from "../screens/groups/AccountEdit";

function getChildRoute(
    route: Partial<Route<string>>,
): Partial<Route<string>> {
    // NOTE: since we use nested navigators we need a utility to traverse the navigation tree and find the currently
    // active subroute

    // @ts-expect-error: this isn't in type definitions coz we want this private
    const state = route[CHILD_STATE] ?? route.state;
    if (state === undefined) {
        return route;
    }

    return state.routes[state.index ??
    (typeof state.type === "string" && state.type !== "stack"
        ? 0
        : state.routes.length - 1)];
}

function getHeaderTitle(route) {
    // If the focused route is not found, we need to assume it's the initial screen
    // This can happen during if there hasn't been any navigation inside the screen
    // In our case, it's "Feed" as that's the first screen inside the navigator
    const routeName = getFocusedRouteNameFromRoute(route) ?? "TransactionList";

    switch (routeName) {
        case "TransactionList":
            return "Transactions";
        case "AccountList":
            return "Accounts";
    }
}

export default function Navigation({ theme }: { theme: Theme }) {
    return (
        <NavigationContainer
            linking={LinkingConfiguration}
            theme={theme}
        >
            <RootNavigator />
        </NavigationContainer>
    );
}


const Drawer = createDrawerNavigator<RootDrawerParamList>();

function RootNavigator() {
    const auth = useRecoilValue(authState);
    const [activeGroupID, setActiveGroupID] = useRecoilState(activeGroupIDState);
    const groups = useRecoilValue(groupState);

    useEffect(() => {
        // initial sync on login
        if (auth.isLoggedIn && !auth.isLoading) {
            syncLocalState().catch(err => {
                notify({ text: `Error on local state sync: ${err}` });
            });
        }
    }, [auth]);

    useEffect(() => {
        if (activeGroupID === null && groups.length > 0) {
            setActiveGroupID(groups[0].id);
        }
    }, [activeGroupID, groups, setActiveGroupID]);


    useEffect(() => { // TODO: proper syncing
        if (activeGroupID === null) {
            return;
        }

        syncLocalGroupState(activeGroupID).catch(err => {
            notify({ text: `Error when syncing group state: ${err}` });
        });
    }, [activeGroupID]);

    if (auth.isLoading) {
        return (
            <SplashScreen />
        );
    }

    return (
        <Drawer.Navigator
            initialRouteName="GroupStackNavigator"
            drawerContent={(props) => <DrawerContent {...props} />}
            screenOptions={{ headerShown: false }}
        >
            {auth.isLoggedIn ? (
                <>
                    <Drawer.Screen name="GroupStackNavigator" component={GroupStackNavigator} />
                    <Drawer.Screen name="Home" options={{ headerShown: true }} component={HomeScreen} />
                    <Drawer.Screen name="Preferences" options={{ headerShown: true }} component={PreferencesScreen} />
                    <Drawer.Screen name="Profile" options={{ headerShown: true }} component={ProfileScreen} />
                </>
            ) : (
                <Drawer.Group>
                    <Drawer.Screen name="Login" component={LoginScreen} options={{ headerTitle: "Login" }} />
                    <Drawer.Screen name="Register" component={RegisterScreen}
                                   options={{ headerTitle: "Register" }} />
                </Drawer.Group>
            )}
        </Drawer.Navigator>
    );
}

const GroupStack = createStackNavigator<GroupStackParamList>();

function GroupStackNavigator() {
    return (
        <GroupStack.Navigator
            initialRouteName="BottomTabNavigator"
            screenOptions={{
                header: (props) => (
                    <Header {...props} />
                ),
            }}
        >
            <GroupStack.Screen
                name="BottomTabNavigator"
                component={BottomTabNavigator}
            />
            <GroupStack.Screen
                name="TransactionDetail"
                component={TransactionDetail}
                options={{ headerTitle: "Transaction Detail" }}
            />
            <GroupStack.Screen
                name="AccountDetail"
                component={AccountDetail}
            />
            <GroupStack.Screen
                name="AccountEdit"
                component={AccountEdit}
            />
        </GroupStack.Navigator>
    );
}

const BottomTab = createBottomTabNavigator<GroupTabParamList>();

function BottomTabNavigator() {
    return (
        <BottomTab.Navigator
            initialRouteName="TransactionList"
            screenOptions={{
                // tabBarActiveTintColor: Colors[colorScheme].tint,
                headerShown: false,
            }}>
            <BottomTab.Screen
                name="TransactionList"
                component={TransactionList}
                options={{
                    title: "Transactions",
                    tabBarIcon: ({ color }) => <TabBarIcon name="euro" color={color} />,
                }}
            />
            <BottomTab.Screen
                name="AccountList"
                options={{
                    title: "People",
                    tabBarIcon: ({ color }) => <TabBarIcon name={personalAccountIcon} color={color} />,
                }}
            >
                {(props) => (<AccountList accountType="personal" {...props} />)}
            </BottomTab.Screen>
            <BottomTab.Screen
                name="ClearingAccountList"
                options={{
                    title: "Events",
                    tabBarIcon: ({ color }) => <TabBarIcon name={clearingAccountIcon} color={color} />,
                }}
            >
                {(props) => (<AccountList accountType="clearing" {...props} />)}
            </BottomTab.Screen>
        </BottomTab.Navigator>
    );
}

/**
 * You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
 */
function TabBarIcon(props: {
    name: React.ComponentProps<typeof MaterialIcons>["name"];
    color: string;
}) {
    return <MaterialIcons size={30} style={{ marginBottom: -3 }} {...props} />;
}
