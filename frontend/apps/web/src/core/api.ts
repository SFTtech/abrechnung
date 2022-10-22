import axios from "axios";
import { DateTime } from "luxon";
import { Api } from "@abrechnung/api";

export const siteHost =
    !process.env["NODE_ENV"] || process.env["NODE_ENV"] === "development"
        ? `${window.location.hostname}:8080`
        : window.location.host;
export const baseURL = `${window.location.protocol}//${siteHost}`;
console.log("API Base URL", baseURL);

export const api = new Api();
api.baseApiUrl = `${baseURL}/api/v1`;

export const initApi = () => {
    const token = localStorage.getItem("access_token");
    const sessionToken = localStorage.getItem("session_token");
    if (token != null && token !== "") {
        console.debug("initializing api with access token:", token);
        api.accessToken = token;
    }
    if (sessionToken != null && sessionToken !== "") {
        console.debug("initializing api with session token:", sessionToken);
        api.sessionToken = sessionToken;
    }
};

export const fetchToken = () => {
    const token = localStorage.getItem("access_token");
    if (token == null || String(token) === "null" || String(token) === "undefined") {
        return null;
    }
    try {
        const payload = token.split(".")[1];
        const { exp: expires } = JSON.parse(atob(payload));
        if (typeof expires === "number" && DateTime.fromSeconds(expires) > DateTime.now()) {
            axiosAPI.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            return token;
        }
    } catch {
        removeToken();
        return null;
    }

    return null;
};

export const getTokenJSON = () => {
    const token = fetchToken();
    if (token == null) {
        return null;
    }

    return JSON.parse(atob(token.split(".")[1]));
};

export const getUserIDFromToken = () => {
    const token = getTokenJSON();
    if (token === null) {
        return null;
    }

    const { user_id: userID } = token;
    return userID;
};

const axiosAPI = axios.create({
    baseURL: `${baseURL}/api/v1`,
});
const baseAxiosApi = axios.create({
    baseURL: `${baseURL}/api/v1`,
});

axios.defaults.headers.common["Content-Type"] = "application/json";
baseAxiosApi.defaults.headers.common["Content-Type"] = "application/json";

const errorInterceptor = (error) => {
    if (
        error.hasOwnProperty("response") &&
        error.response.hasOwnProperty("data") &&
        error.response.data.hasOwnProperty("msg")
    ) {
        return Promise.reject(error.response.data.msg);
    }
    return Promise.reject(error);
};

baseAxiosApi.interceptors.response.use((response) => response, errorInterceptor);
axiosAPI.interceptors.response.use((response) => response, errorInterceptor);
axiosAPI.defaults.headers.common["Content-Type"] = "application/json";

export function setAccessToken(token) {
    localStorage.setItem("access_token", token);
    axiosAPI.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export function setToken(token, sessionToken) {
    localStorage.setItem("session_token", sessionToken);
    setAccessToken(token);
    api.accessToken = token;
    api.sessionToken = sessionToken;
}

export function removeToken() {
    console.log("deleting access token from local storage ...");
    localStorage.removeItem("access_token");
    localStorage.removeItem("session_token");
}

export async function fetchAccessToken(sessionToken) {
    const resp = await baseAxiosApi.post("/auth/fetch_access_token", {
        token: sessionToken,
    });
    setAccessToken(resp.data.access_token);
    return resp.data;
}

export async function refreshToken(): Promise<void> {
    const token = localStorage.getItem("access_token");
    if (
        token == null ||
        String(token) === "null" ||
        String(token) === "undefined" ||
        DateTime.fromSeconds(JSON.parse(atob(token.split(".")[1])).exp) <= DateTime.now().plus({ minutes: 1 })
    ) {
        const sessionToken = localStorage.getItem("session_token");
        if (sessionToken == null) {
            throw new Error("cannot refresh access token");
        }
        const resp = await baseAxiosApi.post("/auth/fetch_access_token", {
            token: sessionToken,
        });
        setAccessToken(resp.data.access_token);
    }
}

async function makePost(url, data = null, options = null) {
    await refreshToken();
    return await axiosAPI.post(url, data, options);
}

async function makeGet(url, options = null) {
    await refreshToken();
    return await axiosAPI.get(url, options);
}

async function makeDelete(url, data = null) {
    await refreshToken();
    return await axiosAPI.delete(url, { data: data });
}

export async function login({ username, password }) {
    const sessionName = navigator.appVersion + " " + navigator.userAgent + " " + navigator.appName;
    const resp = await baseAxiosApi.post("/auth/login", {
        username: username,
        password: password,
        session_name: sessionName,
    });
    setToken(resp.data.access_token, resp.data.session_token);
    return resp.data;
}

export async function logout() {
    try {
        await makePost("/auth/logout");
    } catch {
        // do nothing
    }
    removeToken();
}
