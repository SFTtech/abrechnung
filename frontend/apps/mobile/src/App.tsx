import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider as PaperProvider } from "react-native-paper";
import useColorScheme from "./hooks/useColorScheme";
import { Navigation } from "./navigation";
import { MaterialIcons } from "@expo/vector-icons";
import { CombinedDarkTheme, CombinedDefaultTheme } from "./theme";
import SplashScreen from "./screens/SplashScreen";
import { NotificationProvider } from "./notifications";
import { selectSettingsSlice, selectTheme, useAppSelector, selectAuthSlice, useAppDispatch } from "./store";
import {
    AbrechnungUpdateProvider,
    selectSessionToken,
    fetchGroups,
    selectBaseUrl,
    selectCurrentUserId,
    subscribe,
    unsubscribe,
} from "@abrechnung/redux";
import { api, websocket } from "./core/api";

export const App: React.FC = () => {
    const colorScheme = useColorScheme();
    const dispatch = useAppDispatch();

    const sessionToken = useAppSelector((state) => selectSessionToken({ state: selectAuthSlice(state) }));
    const baseUrl = useAppSelector((state) => selectBaseUrl({ state: selectAuthSlice(state) }));
    const isAuthenticated = sessionToken !== undefined;
    const userId = useAppSelector((state) => selectCurrentUserId({ state: selectAuthSlice(state) }));
    const groupStoreStatus = useAppSelector((state) => state.groups.status);
    const themeMode = useAppSelector((state) => selectTheme({ state: selectSettingsSlice(state) }));
    const useDarkTheme = themeMode === "system" ? colorScheme === "dark" : themeMode === "dark";
    const theme = useDarkTheme ? CombinedDarkTheme : CombinedDefaultTheme;

    React.useEffect(() => {
        if (sessionToken !== undefined && baseUrl !== undefined) {
            console.log("initializing api with session token", sessionToken, "and api url:", baseUrl);
            api.baseApiUrl = baseUrl;
            api.sessionToken = sessionToken;
            websocket.setUrl(`${baseUrl.replace("http://", "ws://").replace("https://", "ws://")}/api/v1/ws`);
            dispatch(fetchGroups({ api }));
        }
    }, [sessionToken, baseUrl, dispatch]);

    React.useEffect(() => {
        if (!isAuthenticated || userId === undefined) {
            return () => {
                return;
            };
        }

        dispatch(subscribe({ subscription: { type: "group", userId }, websocket }));

        return () => {
            dispatch(unsubscribe({ subscription: { type: "group", userId }, websocket }));
        };
    }, [dispatch, isAuthenticated, userId]);

    return (
        <PaperProvider
            theme={theme}
            settings={{
                icon: (props) => <MaterialIcons {...props} />,
            }}
        >
            <SafeAreaProvider>
                <AbrechnungUpdateProvider api={api} websocket={websocket}>
                    <>
                        <React.Suspense fallback={<SplashScreen />}>
                            {isAuthenticated && groupStoreStatus !== "initialized" ? (
                                <SplashScreen />
                            ) : (
                                <Navigation theme={theme} />
                            )}
                        </React.Suspense>
                        <NotificationProvider />
                        <StatusBar />
                    </>
                </AbrechnungUpdateProvider>
            </SafeAreaProvider>
        </PaperProvider>
    );
};

export default App;
