import { AbrechnungWebSocket, Api } from "@abrechnung/api";
import * as React from "react";

export type IInitApi = (baseUrl: string) => { api: Api; websocket: AbrechnungWebSocket };

export interface IApiProvierContext {
    api?: Api;
    websocket?: AbrechnungWebSocket;
    initApi: IInitApi;
}

const ApiContext = React.createContext<IApiProvierContext>(null as unknown as IApiProvierContext);

export type ApiProviderProps = IApiProvierContext & {
    children: React.ReactNode;
};

export const ApiProvider: React.FC<ApiProviderProps> = ({ api, websocket, initApi, children }) => {
    return <ApiContext.Provider value={{ api, websocket, initApi }}>{children}</ApiContext.Provider>;
};

export const useInitApi = () => {
    const { initApi } = React.useContext(ApiContext);
    return initApi;
};

export const useApi = (): { api: Api; websocket: AbrechnungWebSocket; initApi: IInitApi } => {
    const { api, websocket, initApi } = React.useContext(ApiContext);
    if (!api || !websocket) {
        throw new Error("api has not been initialized");
    }
    return { api, websocket, initApi };
};

export const useOptionalApi = (): IApiProvierContext => {
    return React.useContext(ApiContext);
};
