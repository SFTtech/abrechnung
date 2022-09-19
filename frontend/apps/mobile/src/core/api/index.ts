import { db } from "../database";
import deepmerge from "deepmerge";
import * as Network from "expo-network";
import { Buffer } from "buffer";

export let BASE_API_URL = null; // "http://10.150.9.194:8080/api/v1"; // FIXME

let SESSION_TOKEN = null;
let ACCESS_TOKEN = null;

export async function initializeAuthCache() {
    const resp = await db.execute(`
                select *
                from
                    abrechnung_instance
                where
                    is_active_session`
        , []);
    if (resp.rows.length > 0) {
        SESSION_TOKEN = resp.rows[0].session_token;
        ACCESS_TOKEN = resp.rows[0].access_token;
    }
    console.log("initialized auth cache", SESSION_TOKEN, ACCESS_TOKEN);
}

export async function initializeAPIURL(url: string) {
    // TODO: url sanitization
    BASE_API_URL = `${url}/api/v1`;
}

export function validateJWTToken(token: string): boolean {
    const payload = token.split(".")[1];
    try {
        const { exp: expires } = JSON.parse(Buffer.from(payload, "base64").toString("ascii"));
        if (typeof expires === "number" && expires > (new Date()).getTime() / 1000) {
            return true;
        }
    } catch {
        return false;
    }
    return false;
}

async function updateAccessToken() {
    console.log("request to ", `${BASE_API_URL}/auth/fetch_access_token`);
    const resp = await fetch(`${BASE_API_URL}/auth/fetch_access_token`, {
        method: "POST",
        body: JSON.stringify({ token: SESSION_TOKEN }),
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (!resp.ok) {
        const body = await resp.text();
        console.log("error on fetching new access token", body);
        return;
    }
    // TODO: error handling
    const jsonResp = await resp.json();
    ACCESS_TOKEN = jsonResp.access_token;
    return jsonResp.access_token;
}

async function makeAuthHeader() {
    // TODO: find out currently valid abrechnung instance
    if (ACCESS_TOKEN === null || ACCESS_TOKEN === "" || !validateJWTToken(ACCESS_TOKEN)) {
        ACCESS_TOKEN = await updateAccessToken();
        console.log("fetched new access token", ACCESS_TOKEN);
    }

    // TODO: check result
    return {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
    };
}

async function fetchJson(url, options) {
    const authHeaders = await makeAuthHeader();
    try {
        const resp = await fetch(url,
            deepmerge({
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders,
                },
            }, options),
        );
        if (!resp.ok) {
            const body = await resp.text();
            try {
                const error = JSON.parse(body);
                console.log(`Error ${error.code} on ${options.method} to ${url}: ${error.msg}`);
                throw Error(`Error ${error.code} on ${options.method} to ${url}: ${error.msg}`);
            } catch {
                console.log(`Error on ${options.method} to ${url}: ${body}`);
                throw Error(`Error on ${options.method} to ${url}: ${body}`);
            }
        }
        try {
            return resp.json();
        } catch {
            console.log(`Error on ${options.method} to ${url}: invalid json`);
            throw Error(`Error on ${options.method} to ${url}: invalid json`);
        }
    } catch (err) {
        throw Error(`Error on ${options.method} to ${url}: ${err.toString()}`);
    }
}

export async function makePost(url, data = null, options = null) {
    console.log("POST to", url, "with data", data);
    return await fetchJson(`${BASE_API_URL}${url}`, {
        method: "POST",
        body: JSON.stringify(data),
        ...options,
    });
}

export async function makeGet(url, options = null) {
    return await fetchJson(`${BASE_API_URL}${url}`, {
        method: "GET",
        ...options,
    });
}

export async function makeDelete(url, data = null, options = null) {
    return await fetchJson(`${BASE_API_URL}${url}`, {
        method: "GET",
        body: JSON.stringify(data),
        ...options,
    });
}

export async function isOnline() {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isInternetReachable;
}