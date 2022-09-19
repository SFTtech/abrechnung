import { StrictMode, Suspense } from "react";
import * as ReactDOM from "react-dom/client";
import { RecoilRoot } from "recoil";

import App from "./app/app";
import Loading from "./components/style/Loading";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
    <StrictMode>
        <RecoilRoot>
            <Suspense fallback={<Loading />}>
                <App />
            </Suspense>
        </RecoilRoot>
    </StrictMode>
);
