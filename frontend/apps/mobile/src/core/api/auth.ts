import { api, initializeAPIURL, initializeAuthCache } from "./index";
import { db } from "../database";

export async function login({ server, username, password }: { server: string; username: string; password: string }) {
    const payload = {
        username,
        password,
        session_name: "Abrechnung-Mobile",
    };
    try {
        const resp = await fetch(`${server}/api/v1/auth/login`, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (!resp.ok) {
            const body = await resp.text();
            throw new Error(`error on login: ${body}`);
        }
        const jsonResp = await resp.json();
        console.log(payload, server, jsonResp, username);
        await db.execute(`update abrechnung_instance
                          set
                              is_active_session = false`);
        await db.execute(
            `
                insert into abrechnung_instance (
                    url, user_id, username, session_token, is_active_session
                )
                values (
                    ?, ?, ?, ?, true
                )
                on conflict (url) do update set
                                                session_token     = excluded.session_token,
                                                user_id           = excluded.user_id,
                                                username          = excluded.username,
                                                is_active_session = excluded.is_active_session`,
            [server, jsonResp.user_id, username, jsonResp.session_token]
        );
        await initializeAPIURL(server);
        await initializeAuthCache();
        return jsonResp.user_id;
    } catch (err) {
        throw new Error(`error on login: ${err.toString()}`);
    }
}

export async function logout() {
    try {
        await api.logout();
    } catch {
        // do nothing
    }
    await db.execute(
        `update abrechnung_instance
         set
             is_active_session = false,
             session_token     = null,
             access_token      = null
         where
             is_active_session`,
        []
    );
}
