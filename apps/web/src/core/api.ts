import { Api, ApiError, IConnectionStatusProvider, stringifyError } from "@abrechnung/api";
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

const webApi = api;

export const apiBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions
) => {
    const rawBaseQuery = fetchBaseQuery({ baseUrl: baseURL, prepareHeaders: prepareAuthHeaders });
    const result = await rawBaseQuery(args, api, extraOptions);
    if (result.error?.status === 401) {
        webApi.notifyUnauthorized();
    }
    return result;
};

export const handleApiError = (err: ApiError) => {
    const message = stringifyError(err);
    toast.error(message);
};
