import { AbrechnungWebSocket, Api } from "@abrechnung/api";
import {
    AbrechnungUpdateProvider,
    fetchGroups,
    selectAccessToken,
    selectBaseUrl,
    selectCurrentUserId,
    subscribe,
    unsubscribe,
} from "@abrechnung/redux";
import * as React from "react";
import { StatusBar } from "react-native";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { ApiProvider } from "./core/ApiProvider";
import { createApi } from "./core/api";
import { useColorScheme } from "./hooks/useColorScheme";
import { Navigation } from "./navigation";
import { NotificationProvider } from "./notifications";
import { SplashScreen } from "./screens/SplashScreen";
import {
    selectAuthSlice,
    selectSettingsSlice,
    selectTheme,
    setGlobalInfo,
    useAppDispatch,
    useAppSelector,
} from "./store";
import { CustomDarkTheme, CustomLightTheme } from "./theme";

export const App: React.FC = () => {
    const colorScheme = useColorScheme();
    const dispatch = useAppDispatch();
    const [api, setApi] = React.useState<{ api: Api; websocket: AbrechnungWebSocket } | undefined>(undefined);

    const accessToken = useAppSelector((state) => selectAccessToken({ state: selectAuthSlice(state) }));
    const baseUrl = useAppSelector((state) => selectBaseUrl({ state: selectAuthSlice(state) }));
    const isAuthenticated = accessToken !== undefined;
    const userId = useAppSelector((state) => selectCurrentUserId({ state: selectAuthSlice(state) }));
    const groupStoreStatus = useAppSelector((state) => state.groups.status);
    const themeMode = useAppSelector((state) => selectTheme({ state: selectSettingsSlice(state) }));
    const useDarkTheme = themeMode === "system" ? colorScheme === "dark" : themeMode === "dark";
    const theme = useDarkTheme ? CustomDarkTheme : CustomLightTheme;

    const initApi = React.useCallback(
        (baseUrl: string) => {
            const newApi = createApi(baseUrl);
            setApi(newApi);
            return newApi;
        },
        [setApi]
    );

    React.useEffect(() => {
        if (baseUrl !== undefined) {
            const { api, websocket } = createApi(baseUrl);
            console.log("initializing api with access token", accessToken, "and api url:", baseUrl);
            api.init(accessToken)
                .then(() => {
                    dispatch(fetchGroups({ api: api })).then(() => {
                        setApi({ api, websocket });
                    });
                })
                .catch((err) => {
                    dispatch(setGlobalInfo({ text: err.toString(), category: "error" }));
                });
        }
    }, [accessToken, baseUrl, dispatch]);

    React.useEffect(() => {
        if (!api) {
            return;
        }
        if (!isAuthenticated || userId === undefined) {
            return () => {
                return;
            };
        }

        dispatch(subscribe({ subscription: { type: "group", userId }, websocket: api.websocket }));

        return () => {
            dispatch(unsubscribe({ subscription: { type: "group", userId }, websocket: api.websocket }));
        };
    }, [api, dispatch, isAuthenticated, userId]);

    return (
        <PaperProvider
            theme={theme}
            settings={{
                icon: (props) => <MaterialIcons {...props} />,
            }}
        >
            <SafeAreaProvider>
                {baseUrl !== undefined && api === undefined ? (
                    <SplashScreen />
                ) : (
                    <ApiProvider api={api?.api} websocket={api?.websocket} initApi={initApi}>
                        <AbrechnungUpdateProvider api={api?.api} websocket={api?.websocket}>
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
                    </ApiProvider>
                )}
            </SafeAreaProvider>
        </PaperProvider>
    );
};
