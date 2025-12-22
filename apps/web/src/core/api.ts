import { Api, ApiError, IConnectionStatusProvider } from "@abrechnung/api";
import {
    fetchBaseQuery,
    type BaseQueryFn,
    type FetchArgs,
    type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { toast } from "react-toastify";

export const siteHost = window.location.host;
export const baseURL = `${window.location.protocol}//${siteHost}`;

const connectionStatusProvider: IConnectionStatusProvider = {
    hasConnection: async () => {
        return true;
    },
};

export const api = new Api(connectionStatusProvider, baseURL);

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

export const handleApiError = (err: ApiError) => {
    let message = err.name;
    if (typeof err.body?.message === "string") {
        message = err.body.message;
    }
    toast.error(message);
};
