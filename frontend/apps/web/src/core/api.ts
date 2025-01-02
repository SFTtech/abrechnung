import { AbrechnungWebSocket, Api, IConnectionStatusProvider } from "@abrechnung/api";

export const siteHost = window.location.host;
export const baseURL = `${window.location.protocol}//${siteHost}`;
console.log("API Base URL", baseURL);

const connectionStatusProvider: IConnectionStatusProvider = {
    hasConnection: async () => {
        return true;
    },
};

export const api = new Api(connectionStatusProvider, baseURL);

const websocketURL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${siteHost}/api/v1/ws`;

export const ws = new AbrechnungWebSocket(websocketURL, api);
