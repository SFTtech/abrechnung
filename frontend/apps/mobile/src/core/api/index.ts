import { db } from "../database";
import * as Network from "expo-network";
import { Api } from "@abrechnung/api";

export const api = new Api();

export async function initializeAuthCache() {
    const resp = await db.execute(
        `
            select *
            from
                abrechnung_instance
            where
                is_active_session`,
        []
    );
    if (resp.rows.length > 0) {
        api.sessionToken = resp.rows[0].session_token;
        api.accessToken = resp.rows[0].access_token;
    }
}

export async function initializeAPIURL(url: string) {
    // TODO: url sanitization
    api.baseApiUrl = `${url}/api/v1`;
}

export async function isOnline() {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isInternetReachable;
}
