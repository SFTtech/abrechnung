import { atom, selector } from "recoil";
import { fetchProfile, getUserIDFromToken } from "../api";
import { ws } from "../websocket";

export const userData = atom({
    key: "userData",
    default: selector({
        key: "userData/default",
        get: async ({ get }) => {
            try {
                return await fetchProfile();
            } catch (err) {
                return null;
            }
        }
    }),
    effects_UNSTABLE: [
        ({ setSelf, trigger }) => {
            const userID = getUserIDFromToken();
            if (userID !== null) {
                ws.subscribe("user", userID, ({ subscription_type, element_id }) => {
                    if (subscription_type === "user" && element_id === userID) {
                        fetchProfile().then(result => {
                            setSelf(result);
                        });
                    }
                });
                // TODO: handle registration errors

                return () => {
                    ws.unsubscribe("user", userID);
                };
            }
        }
    ]
});

export const isAuthenticated = selector({
    key: "isAuthenticated",
    get: async ({ get }) => {
        const user = get(userData);
        return user !== null;
    }
});