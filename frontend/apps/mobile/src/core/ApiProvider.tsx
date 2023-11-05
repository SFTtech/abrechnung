import { AbrechnungWebSocket, Api } from "@abrechnung/api";
import * as React from "react";

export interface IApiProvierContext {
    api: Api;
    websocket: AbrechnungWebSocket;
    initApi: (baseUrl: string) => { api: Api; websocket: AbrechnungWebSocket };
}

const ApiContext = React.createContext<IApiProvierContext>(null as unknown as IApiProvierContext);

export type ApiProviderProps = IApiProvierContext & {
    children: React.ReactNode;
};

export const ApiProvider: React.FC<ApiProviderProps> = ({ api, websocket, initApi, children }) => {
    return <ApiContext.Provider value={{ api, websocket, initApi }}>{children}</ApiContext.Provider>;
};

export const useApi = () => {
    return React.useContext(ApiContext);
};
