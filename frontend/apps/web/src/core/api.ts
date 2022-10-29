import { AbrechnungWebSocket, Api } from "@abrechnung/api";

export const siteHost =
    !process.env["NODE_ENV"] || process.env["NODE_ENV"] === "development"
        ? `${window.location.hostname}:8080`
        : window.location.host;
export const baseURL = `${window.location.protocol}//${siteHost}`;
console.log("API Base URL", baseURL);

export const api = new Api();
api.baseApiUrl = `${baseURL}/api/v1`;

const websocketURL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${siteHost}/api/v1/ws`;

export const ws = new AbrechnungWebSocket(websocketURL, api);

export const initApi = () => {
    const sessionToken = localStorage.getItem("sessionToken");
    if (sessionToken != null && sessionToken !== "") {
        console.debug("initializing api with session token:", sessionToken);
        api.sessionToken = sessionToken;
    }
};

export const getUserIDFromToken = (): number | null => {
    const token = api.getTokenJSON();
    if (token === null) {
        return null;
    }

    return token.userID;
};

const setSessionToken = (sessionToken: string): void => {
    localStorage.setItem("sessionToken", sessionToken);
};

export const removeToken = (): void => {
    console.log("deleting session token from local storage ...");
    localStorage.removeItem("sessionToken");
};

export const login = async (username: string, password: string): Promise<void> => {
    const sessionName = navigator.appVersion + " " + navigator.userAgent + " " + navigator.appName;
    const resp = await api.login(username, password, sessionName);
    setSessionToken(resp.sessionToken);
};

export const logout = async (): Promise<void> => {
    try {
        await api.logout();
    } catch {
        // do nothing
    }
    removeToken();
};
