import {atom, selector} from "recoil";
import {fetchProfile, fetchToken} from "../api";

export const userData = atom({
    key: "userData",
    default: selector({
        key: "userData/default",
        get: async ({get}) => {
            const token = fetchToken();
            if (token === null) {
                return null;
            }
            try {
                return await fetchProfile();
            } catch (err) {
                return null;
            }
        }
    })
})

export const isAuthenticated = selector({
    key: "isAuthenticated",
    get: async ({get}) => {
        const user = get(userData);
        return user !== null;
    }
})