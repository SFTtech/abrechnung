import {atom, selector} from "recoil";
import {ws} from "../websocket";

export const fetchToken = () => {
    const token = localStorage.getItem("sessionToken");
    if (!!token && String(token) !== "null" && String(token) !== "undefined") {
        return token;
    }

    return null;
}

export const fetchUserID = () => {
    const token = localStorage.getItem("userID");
    if (!!token && String(token) !== "null" && String(token) !== "undefined") {
        return parseInt(token);
    }

    return null;
}

export const userData = atom({
    key: "userData",
    default: {},
})

export const isAuthenticated = atom({
    key: "isAuthenticated",
    default: false
})


const fetchSessions = async () => {
    return await ws.call("list_sessions", {
        authtoken: fetchToken(),
    });
}

export const userSessions = atom({
    key: "userSessions",
    default: selector({
        key: "userSessions/default",
        get: async ({get}) => {
            return await fetchSessions();
        }
    }),
    effects_UNSTABLE: [
        ({setSelf, trigger}) => {
            const userID = fetchUserID();
            ws.subscribe(fetchToken(), "session", () => {
                // fetchSessions().then(result => setSelf(result));
            }, {element_id: userID})
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("session", {element_id: userID});
            };
        }
    ]
})

export const fetchUserData = async () => {
    const user = await ws.call("get_user_info", {
        authtoken: fetchToken(),
    });
    localStorage.setItem("userID", user[0].id);
    return user[0];
}

export const login = async ({username, password}) => {
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("userID");
    const sessionName = navigator.appVersion + " " + navigator.userAgent + " " + navigator.appName;
    const token = await ws.call("login_with_password", {
        session: sessionName,
        username: username,
        password: password,
    });
    localStorage.setItem("sessionToken", token[0].token);
    return token[0].token;
}

export const logout = async () => {
    const token = fetchToken();
    if (token) {
        localStorage.removeItem("sessionToken");
        localStorage.removeItem("userID");
        await ws.call("logout", {
            authtoken: token,
        });
    }
    return true;
}

export const register = async ({email, username, password}) => {
    return await ws.call("register_user", {
        email: email,
        username: username,
        password: password,
    })
}

export const renameSession = async ({sessionID, newName}) => {
    return await ws.call("rename_session", {
        authtoken: fetchToken(),
        session_id: sessionID,
        new_name: newName,
    })
}

export const deleteSession = async ({sessionID}) => {
    return await ws.call("logout_session", {
        authtoken: fetchToken(),
        session_id: sessionID,
    })
}