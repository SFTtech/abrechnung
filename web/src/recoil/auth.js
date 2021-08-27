import {atom, selector} from "recoil";
import {fetchToken} from "../api";

export const userData = atom({
    key: "userData",
    default: {},
})

export const isAuthenticated = atom({
    key: "isAuthenticated",
    default: selector({
        key: "isAuthenticated/default",
        get: async ({get}) => {
            return fetchToken() !== null;
        }
    })
})