import React from "react";
import "react-native-gesture-handler";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { App } from "./App";
import { SplashScreen } from "./screens/SplashScreen";
import { persistor, store } from "./store";

export const AppWrapper: React.FC = () => {
    return (
        <Provider store={store}>
            <PersistGate loading={<SplashScreen />} persistor={persistor}>
                <App />
            </PersistGate>
        </Provider>
    );
};
