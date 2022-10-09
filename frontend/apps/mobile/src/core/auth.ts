import { db } from "./database";
import { atom } from "recoil";
import { logout as logoutAPI } from "./api/auth";
import { initializeAPIURL } from "./api";

interface authStateType {
    isLoading: boolean;
    isLoggedIn: boolean;
}

async function initialAuthState(): Promise<authStateType> {
    console.log("fetching initial auth state");
    // TODO: handle auth failure
    const dbResult = await db.execute(`select *
                                       from
                                           abrechnung_instance
                                       where
                                           is_active_session`);
    if (dbResult.rows.length === 0) {
        return {
            isLoading: false,
            isLoggedIn: false,
        };
    }

    await initializeAPIURL(dbResult.rows[0].url);
    return {
        isLoading: false,
        isLoggedIn: true,
    };
}

export const authState = atom<authStateType>({
    key: "authState",
    default: initialAuthState(),
});

export async function logout() {
    return await logoutAPI();
}

export const userProfileState = atom({
    key: "userProfileState",
    default: {},
});
