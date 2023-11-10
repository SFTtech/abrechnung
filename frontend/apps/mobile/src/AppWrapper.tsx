import React from "react";
import "react-native-gesture-handler";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { App } from "./App";
import { useCachedResources } from "./hooks/useCachedResources";
import SplashScreen from "./screens/SplashScreen";
import { persistor, store } from "./store";

export const AppWrapper: React.FC = () => {
    const isLoadingComplete = useCachedResources();

    if (!isLoadingComplete) {
        return <SplashScreen />;
    } else {
        return (
            <Provider store={store}>
                <PersistGate loading={<SplashScreen />} persistor={persistor}>
                    <App />
                </PersistGate>
            </Provider>
        );
    }
};
