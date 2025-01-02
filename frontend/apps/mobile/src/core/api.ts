import { AbrechnungWebSocket, Api, IConnectionStatusProvider } from "@abrechnung/api";
import type { BaseQueryApi, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
// import { fetch as fetchNetworkState } from "@react-native-community/netinfo";

export const connectionStatusProvider: IConnectionStatusProvider = {
    hasConnection: async () => {
        // const networkState = await fetchNetworkState();
        // return networkState.isInternetReachable;
        return true;
    },
};

export const createApi = (baseUrl: string): { api: Api; websocket: AbrechnungWebSocket } => {
    const api = new Api(connectionStatusProvider, baseUrl);
    const websocketUrl = `${baseUrl.replace("http://", "ws://").replace("https://", "ws://")}/api/v1/ws`;
    const websocket = new AbrechnungWebSocket(websocketUrl, api);
    return { api, websocket };
};
