import React, { Suspense } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import "typeface-roboto";
import "react-toastify/dist/ReactToastify.css";
import App from "./App";
import { RecoilRoot } from "recoil";
import * as serviceWorker from "./serviceWorker";
import Loading from "./components/style/Loading";

ReactDOM.render(
    <React.StrictMode>
        <RecoilRoot>
            <Suspense fallback={<Loading />}>
                <App />
            </Suspense>
        </RecoilRoot>
    </React.StrictMode>,
    document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
