import React from "react";
import SplashScreen from "./screens/SplashScreen";
import useCachedResources from "./hooks/useCachedResources";
import { Provider } from "react-redux";
import { App } from "./App";
import { PersistGate } from "redux-persist/integration/react";
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

export default AppWrapper;
