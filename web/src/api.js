import axios from "axios";
import {DateTime} from "luxon";


export const siteHost = !process.env.NODE_ENV || process.env.NODE_ENV === 'development' ? `${window.location.hostname}:8080` : window.location.host;
export const baseURL = `${window.location.protocol}://${siteHost}`;

export const fetchToken = () => {
    const token = localStorage.getItem("access_token");
    if (token == null || String(token) === "null" || String(token) === "undefined") {
        return null;
    }
    try {
        const payload = token.split(".")[1];
        const {exp: expires} = JSON.parse(atob(payload));
        if (typeof expires === "number" && (new Date(expires * 1000) > new Date())) {
            api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            return token;
        }
    } catch {
        removeToken();
        return null;
    }

    return null;
};

export const getTokenJSON = () => {
    const token = fetchToken();
    if (token == null) {
        return null;
    }

    return JSON.parse(atob(token.split(".")[1]));
}

export const getUserIDFromToken = () => {
    const token = getTokenJSON();

    const {user_id: userID} = token;
    return userID;
};

const api = axios.create({
    baseURL: `${baseURL}/api/v1`
});
const bareApi = axios.create({
    baseURL: `${baseURL}/api/v1`
});


axios.defaults.headers.common["Content-Type"] = "application/json";
bareApi.defaults.headers.common["Content-Type"] = "application/json";
axios.interceptors.response.use(response => response, error => {
    console.log(error.response.data, error.response.data.hasOwnProperty("msg"))
    if (error.response.data.hasOwnProperty("msg")) {
        return Promise.reject(error.response.data.msg);
    }
    return Promise.reject(error);
})

api.defaults.headers.common["Content-Type"] = "application/json";

export function setAccessToken(token) {
    localStorage.setItem("access_token", token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export function setToken(token, sessionToken) {
    localStorage.setItem("session_token", sessionToken);
    setAccessToken(token);
}

export function removeToken() {
    console.log("deleting access token from local storage ...");
    localStorage.removeItem("access_token");
    localStorage.removeItem("session_token");
}

export async function fetchAccessToken(sessionToken) {
    const resp = await bareApi.post("/auth/fetch_access_token", {token: sessionToken});
    setAccessToken(resp.data.access_token);
    return resp.data;
}

async function refreshToken() {
    const token = getTokenJSON();
    const sessionToken = localStorage.getItem("session_token");
    if (token == null || sessionToken == null) {
        return Promise.reject("cannot refresh access token")
    }
    const {exp: tokenExpiry} = token;
    if (DateTime.fromSeconds(tokenExpiry) <= DateTime.now().plus({minutes: 3})) {
        const resp = await bareApi.post("/auth/fetch_access_token", {token: sessionToken});
        setAccessToken(resp.data.access_token);
    }
}

async function makePost(url, data) {
    await refreshToken();
    return await api.post(url, data);
}

async function makeGet(url) {
    await refreshToken();
    return await api.get(url);
}

async function makeDelete(url, data = null) {
    await refreshToken();
    return await api.delete(url, data);
}

export async function login({username, password}) {
    const sessionName = navigator.appVersion + " " + navigator.userAgent + " " + navigator.appName;
    const resp = await bareApi.post("/auth/login", {username: username, password: password, session_name: sessionName});
    setToken(resp.data.access_token, resp.data.session_token);
    return resp.data;
}

export async function logout() {
    removeToken();
}

export async function register({username, email, password}) {
    const resp = await bareApi.post("/auth/register", {username: username, email: email, password: password});
    return resp.data;
}

export async function fetchProfile() {
    const resp = await makeGet("/profile");
    return resp.data;
}

export async function deleteSession({sessionID}) {
    const resp = await makePost("/auth/delete_session", {session_id: sessionID});
    return resp.data;
}

export async function renameSession({sessionID, name}) {
    const resp = await makePost("/auth/rename_session", {session_id: sessionID, name: name});
    return resp.data;
}

export async function changeEmail({password, newEmail}) {
    const resp = await makePost("/profile/change_email", {password: password, email: newEmail});
    return resp.data;
}

export async function changePassword({oldPassword, newPassword}) {
    const resp = await makePost("/profile/change_password", {
        old_password: oldPassword,
        new_password: newPassword
    });
    return resp.data;
}

export async function confirmRegistration({token}) {
    const resp = await bareApi.post("/auth/confirm_registration", {
        token: token
    });
    return resp.data;
}

export async function confirmEmailChange({token}) {
    const resp = await bareApi.post("/auth/confirm_email_change", {
        token: token
    });
    return resp.data;
}

export async function confirmPasswordReset({token}) {
    const resp = await bareApi.post("/auth/confirm_password_reset", {
        token: token
    });
    return resp.data;
}

export async function fetchGroups() {
    const resp = await makeGet("/groups");
    return resp.data;
}

export async function fetchGroup(groupID) {
    const resp = await makeGet(`/groups/${groupID}`);
    return resp.data;
}


export async function createGroup({name, description, currencySymbol = "€", terms = ""}) {
    const resp = await makePost("/groups", {
        name: name,
        description: description,
        currency_symbol: currencySymbol,
        terms: terms
    });
    return resp.data;
}

export async function updateGroupMetadata({groupID, name, description, currencySymbol, terms}) {
    const resp = await makePost(`/groups/${groupID}`, {
        name: name,
        description: description,
        currency_symbol: currencySymbol,
        terms: terms
    });
    return resp.data;
}

export async function updateGroupMemberPrivileges({groupID, userID, isOwner, canWrite}) {
    const resp = await makePost(`/groups/${groupID}/members`, {
        user_id: userID,
        is_owner: isOwner,
        can_write: canWrite
    });
    return resp.data;
}

export async function fetchGroupPreview({token}) {
    const resp = await makePost(`/groups/preview`, {
        invite_token: token
    });
    return resp.data;
}

export async function joinGroup({token}) {
    const resp = await makePost(`/groups/join`, {
        invite_token: token
    });
    return resp.data;
}

export async function fetchInvites({groupID}) {
    const resp = await makeGet(`/groups/${groupID}/invites`);
    return resp.data;
}


export async function createGroupInvite({groupID, description, validUntil, singleUse}) {
    const resp = await makePost(`/groups/${groupID}/invites`, {
        description: description,
        valid_until: validUntil,
        single_use: singleUse
    });
    return resp.data;
}

export async function deleteGroupInvite({groupID, inviteID}) {
    const resp = await makeDelete(`/groups/${groupID}/invites/${inviteID}`);
    return resp.data;
}

export async function fetchMembers({groupID}) {
    const resp = await makeGet(`/groups/${groupID}/members`);
    return resp.data;
}

export async function fetchAccounts({groupID}) {
    const resp = await makeGet(`/groups/${groupID}/accounts`);
    return resp.data;
}

export async function createAccount({groupID, name, description, accountType = "personal"}) {
    const resp = await makePost(`/groups/${groupID}/accounts`, {
        name: name,
        description: description,
        type: accountType
    });
    return resp.data;
}

export async function updateAccount({groupID, accountID, name, description}) {
    const resp = await makePost(`/groups/${groupID}/accounts/${accountID}`, {
        name: name,
        description: description
    });
    return resp.data;
}

export async function fetchTransactions({groupID}) {
    const resp = await makeGet(`/groups/${groupID}/transactions`);
    return resp.data;
}

export async function createTransaction({
                                            groupID,
                                            type,
                                            description,
                                            value,
                                            currencySymbol = "€",
                                            currencyConversionRate = 1.0
                                        }) {
    const resp = await makePost(`/groups/${groupID}/transactions`, {
        description: description,
        value: value,
        type: type,
        currency_symbol: currencySymbol,
        currency_conversion_rate: currencyConversionRate
    });
    return resp.data;
}

export async function updateTransactionDetails({
                                                   groupID,
                                                   transactionID,
                                                   description,
                                                   value,
                                                   currencySymbol,
                                                   currencyConversionRate
                                               }) {
    const resp = await makePost(`/groups/${groupID}/transactions/${transactionID}`, {
        description: description,
        value: value,
        currency_symbol: currencySymbol,
        currency_conversion_rate: currencyConversionRate
    });
    return resp.data;
}

export async function createOrUpdateCreditorShare({groupID, transactionID, accountID, value}) {
    const resp = await makePost(`/groups/${groupID}/transactions/${transactionID}/creditor_shares`, {
        account_id: accountID,
        value: value
    });
    return resp.data;
}

export async function switchCreditorShare({groupID, transactionID, accountID, value}) {
    const resp = await makePost(`/groups/${groupID}/transactions/${transactionID}/creditor_shares/switch`, {
        account_id: accountID,
        value: value
    });
    return resp.data;
}

export async function deleteCreditorShare({groupID, transactionID, accountID}) {
    const resp = await makeDelete(`/groups/${groupID}/transactions/${transactionID}/creditor_shares`, {
        data: {
            account_id: accountID
        }
    });
    return resp.data;
}

export async function createOrUpdateDebitorShare({groupID, transactionID, accountID, value}) {
    const resp = await makePost(`/groups/${groupID}/transactions/${transactionID}/debitor_shares`, {
        account_id: accountID,
        value: value
    });
    return resp.data;
}

export async function switchDebitorShare({groupID, transactionID, accountID, value}) {
    const resp = await makePost(`/groups/${groupID}/transactions/${transactionID}/debitor_shares/switch`, {
        account_id: accountID,
        value: value
    });
    return resp.data;
}

export async function deleteDebitorShare({groupID, transactionID, accountID}) {
    const resp = await makeDelete(`/groups/${groupID}/transactions/${transactionID}/debitor_shares`, {
        data: {
            account_id: accountID
        }
    });
    return resp.data;
}

export async function commitTransaction({groupID, transactionID}) {
    const resp = await makePost(`/groups/${groupID}/transactions/${transactionID}/commit`);
    return resp.data;
}

export async function createTransactionChange({groupID, transactionID}) {
    const resp = await makePost(`/groups/${groupID}/transactions/${transactionID}/new_change`);
    return resp.data;
}

export async function discardTransactionChange({groupID, transactionID}) {
    const resp = await makePost(`/groups/${groupID}/transactions/${transactionID}/discard`);
    return resp.data;
}

export async function deleteTransaction({groupID, transactionID}) {
    const resp = await makeDelete(`/groups/${groupID}/transactions/${transactionID}`);
    return resp.data;
}

