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

/**
 * fetchBaseQuery joins array query params with commas (`a=1,2`), the backend expects repeated keys (`a=1&a=2`).
 * Move array params into the url query string instead.
 */
export const serializeArrayParams = (args: string | FetchArgs): string | FetchArgs => {
    if (typeof args === "string" || !args.params) {
        return args;
    }
    const arrayParams = Object.entries(args.params).filter(([, value]) => Array.isArray(value));
    if (arrayParams.length === 0) {
        return args;
    }
    const search = new URLSearchParams();
    const params: Record<string, unknown> = { ...args.params };
    for (const [key, values] of arrayParams) {
        delete params[key];
        for (const value of values as unknown[]) {
            search.append(key, String(value));
        }
    }
    const url = `${args.url}${args.url.includes("?") ? "&" : "?"}${search.toString()}`;
    return { ...args, url, params };
};

export const apiBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions
) => {
    const rawBaseQuery = fetchBaseQuery({ baseUrl: baseURL, prepareHeaders: prepareAuthHeaders });
    const result = await rawBaseQuery(serializeArrayParams(args), api, extraOptions);
    if (result.error?.status === 401) {
        webApi.notifyUnauthorized();
    }
    return result;
};

export const handleApiError = (err: ApiError) => {
    const message = stringifyError(err);
    toast.error(message);
};
