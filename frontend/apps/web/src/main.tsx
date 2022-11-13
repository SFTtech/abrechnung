import React from "react";
import { Provider } from "react-redux";
import * as ReactDOM from "react-dom/client";
import { RecoilRoot } from "recoil";
import { persistor, store } from "./store";

import App from "./app/app";
import Loading from "./components/style/Loading";
import { PersistGate } from "redux-persist/integration/react";

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
