import { atom, selector } from "recoil";
import { api, ws, getUserIDFromToken } from "../core/api";

export interface Session {
    id: number;
    name: string;
    valid_until: string;
    last_seen: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    is_guest_user: boolean;
    registered_at: string;
    sessions: Session[];
}

export const userData = atom<User>({
    key: "userData",
    default: selector({
        key: "userData/default",
        get: async ({ get }) => {
            try {
                return await api.fetchProfile();
            } catch (err) {
                return null;
            }
        },
    }),
    // effects: [
    //     ({ setSelf, trigger }) => {
    //         console.log(api.accessToken);
    //         const userID = getUserIDFromToken();
    //         if (userID !== null) {
    //             ws.subscribe("user", userID, (subscriptionType, { subscription_type, element_id }) => {
    //                 if (subscription_type === "user" && element_id === userID) {
    //                     api.fetchProfile().then((result) => {
    //                         setSelf(result);
    //                     });
    //                 }
    //             });
    //             // TODO: handle registration errors

    //             return () => {
    //                 ws.unsubscribe("user", userID);
    //             };
    //         }
    //         return null;
    //     },
    // ],
});

export const isGuestUser = selector<boolean>({
    key: "isGuestUser",
    get: async ({ get }) => {
        const user = get(userData);
        return user.is_guest_user;
    },
});

export const isAuthenticated = selector<boolean>({
    key: "isAuthenticated",
    get: async ({ get }) => {
        const user = get(userData);
        return user !== null;
    },
});
