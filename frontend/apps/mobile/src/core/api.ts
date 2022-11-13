import { AbrechnungWebSocket, Api, IConnectionStatusProvider } from "@abrechnung/api";
import * as Network from "expo-network";

const connectionStatusProvider: IConnectionStatusProvider = {
    hasConnection: async () => {
        const networkState = await Network.getNetworkStateAsync();
        return networkState.isInternetReachable ?? false;
    },
};

export const api = new Api(connectionStatusProvider);

export const websocket = new AbrechnungWebSocket("ws://10.150.9.104:8080/api/v1/ws", api);
