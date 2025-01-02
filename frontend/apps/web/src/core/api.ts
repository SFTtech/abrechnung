import { Api, IConnectionStatusProvider } from "@abrechnung/api";
import {
    fetchBaseQuery,
    type BaseQueryFn,
    type FetchArgs,
    type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

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

export const prepareAuthHeaders = (headers: Headers) => {
    const token = api.getAccessToken();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
};

export const apiBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions
) => {
    const rawBaseQuery = fetchBaseQuery({ baseUrl: baseURL, prepareHeaders: prepareAuthHeaders });
    return rawBaseQuery(args, api, extraOptions);
};
