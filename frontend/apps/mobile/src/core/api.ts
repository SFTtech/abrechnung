import { AbrechnungWebSocket, Api, IConnectionStatusProvider } from "@abrechnung/api";
import * as Network from "expo-network";

export const connectionStatusProvider: IConnectionStatusProvider = {
    hasConnection: async () => {
        const networkState = await Network.getNetworkStateAsync();
        return networkState.isInternetReachable ?? false;
    },
};

export const createApi = (baseUrl: string): { api: Api; websocket: AbrechnungWebSocket } => {
    const api = new Api(connectionStatusProvider, baseUrl);
    const websocketUrl = `${baseUrl.replace("http://", "ws://").replace("https://", "ws://")}/api/v1/ws`;
    const websocket = new AbrechnungWebSocket(websocketUrl, api);
    return { api, websocket };
};
