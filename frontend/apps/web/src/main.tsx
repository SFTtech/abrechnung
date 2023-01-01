import React from "react";
import * as ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RecoilRoot } from "recoil";
import { PersistGate } from "redux-persist/integration/react";
import App from "./app/app";
import Loading from "./components/style/Loading";
import "./i18n";
import { persistor, store } from "./store";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
    // <React.StrictMode>
    <RecoilRoot>
        <Provider store={store}>
            <PersistGate loading={<Loading />} persistor={persistor}>
                <React.Suspense fallback={<Loading />}>
                    <App />
                </React.Suspense>
            </PersistGate>
        </Provider>
    </RecoilRoot>
    // </React.StrictMode>
);
