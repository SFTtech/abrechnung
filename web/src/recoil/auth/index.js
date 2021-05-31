import {atom, selector} from "recoil";
import {ws} from "../../websocket";

export const fetchToken = () => {
    const token = localStorage.getItem("sessionToken");
    if (!!token && String(token) !== "null" && String(token) !== "undefined") {
        return token;
    }

    return null;
}

export const sessionToken = atom({
    key: "sessionToken",
    default: null
})

export const userData = atom({
    key: "userData",
    default: {},
})

export const isAuthenticated = atom({
    key: "isAuthenticated",
    default: false
})

export const userSessions = atom({
    key: "userSessions",
    default: selector({
        key: "userSessions/default",
        get: async ({get}) => {
            return await ws.call("list_sessions", {
                authtoken: await get(sessionToken),
            });
        }
    })
})

export const fetchUserData = async({authToken}) => {
    const user = await ws.call("get_user_info", {
            authtoken: authToken,
        });
    return user[0];
}

export const login = async ({username, password}) => {
    localStorage.removeItem("sessionToken");
    const sessionName = navigator.appVersion + " " + navigator.userAgent + " " + navigator.appName;
    const token = await ws.call("login_with_password", {
        session: sessionName,
        username: username,
        password: password,
    });
    localStorage.setItem("sessionToken", token[0].token);
    console.log(token)
    return token[0].token;
}

export const logout = async () => {
    const token = fetchToken();
    if (token) {
        localStorage.removeItem("sessionToken");
        await ws.call("logout", {
            authtoken: token,
        });
    }
    return true;
}

export const register = async ({email, username, password}) => {
    return ws.call("register_user", {
        email: email,
        username: username,
        password: password,
    })
}
