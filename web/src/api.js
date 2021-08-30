import axios from "axios";

export const fetchToken = () => {
    const token = localStorage.getItem("access_token");
    if (token == null || String(token) === "null" || String(token) === "undefined") {
        return null;
    }
    try {
        const payload = token.split(".")[1];
        const { exp: expires } = JSON.parse(atob(payload));
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

export const getUserIDFromToken = () => {
    const token = fetchToken();
    if (token == null) {
        return null;
    }

    const { user_id: userID } = JSON.parse(atob(token.split(".")[1]));
    return userID;
};

export const api = axios.create({
    baseURL: "http://10.150.9.148:8080/api/v1"
    // baseURL: "http://localhost:8080/api/v1"
});

api.defaults.headers.common["Content-Type"] = "application/json";
api.interceptors.response.use(response => response, error => {
    console.log(error.response.data, error.response.data.hasOwnProperty("msg"))
    if (error.response.data.hasOwnProperty("msg")) {
        return Promise.reject(error.response.data.msg);
    }
    return Promise.reject(error);
})

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

export async function login({ username, password }) {
    const resp = await api.post("/auth/login", { username: username, password: password });
    setToken(resp.data.access_token, resp.data.session_token);
    return resp.data;
}

export async function fetchAccessToken() {
    const sessionToken = localStorage.getItem("session_token");
    const resp = await api.post("/auth/fetch_access_token", { token: sessionToken });
    setAccessToken(resp.data.access_token);
    return resp.data;
}

export async function logout() {
    removeToken();
}

export async function register({ username, email, password }) {
    const resp = await api.post("/auth/register", { username: username, email: email, password: password });
    return resp.data;
}

export async function fetchProfile() {
    const resp = await api.get("/profile");
    return resp.data;
}

export async function changeEmail({ password, newEmail }) {
    const resp = await api.post("/profile/change_email", { password: password, email: newEmail });
    return resp.data;
}

export async function changePassword({ oldPassword, newPassword }) {
    const resp = await api.post("/profile/change_password", {
        old_password: oldPassword,
        new_password: newPassword
    });
    return resp.data;
}

export async function confirmRegistration({ token }) {
    const resp = await api.post("/auth/confirm_registration", {
        token: token
    });
    return resp.data;
}

export async function confirmEmailChange({ token }) {
    const resp = await api.post("/auth/confirm_email_change", {
        token: token
    });
    return resp.data;
}

export async function confirmPasswordReset({ token }) {
    const resp = await api.post("/auth/confirm_password_reset", {
        token: token
    });
    return resp.data;
}

export async function fetchGroups() {
    const resp = await api.get("/groups");
    return resp.data;
}

export async function fetchGroup(groupID) {
    const resp = await api.get(`/groups/${groupID}`);
    return resp.data;
}


export async function createGroup({ name, description, currencySymbol = "€", terms = "" }) {
    const resp = await api.post("/groups", {
        name: name,
        description: description,
        currency_symbol: currencySymbol,
        terms: terms
    });
    return resp.data;
}

export async function updateGroupMetadata({ groupID, name, description, currencySymbol, terms }) {
    const resp = await api.post(`/groups/${groupID}`, {
        name: name,
        description: description,
        currency_symbol: currencySymbol,
        terms: terms
    });
    return resp.data;
}

export async function updateGroupMemberPrivileges({ groupID, userID, isOwner, canWrite }) {
    const resp = await api.post(`/groups/${groupID}/members`, {
        user_id: userID,
        is_owner: isOwner,
        can_write: canWrite
    });
    return resp.data;
}

export async function fetchGroupPreview({ token }) {
    const resp = await api.post(`/groups/preview`, {
        invite_token: token
    });
    return resp.data;
}

export async function joinGroup({ token }) {
    const resp = await api.post(`/groups/join`, {
        invite_token: token
    });
    return resp.data;
}

export async function fetchInvites({ groupID }) {
    const resp = await api.get(`/groups/${groupID}/invites`);
    return resp.data;
}


export async function createGroupInvite({ groupID, description, validUntil, singleUse }) {
    const resp = await api.post(`/groups/${groupID}/invites`, {
        description: description,
        valid_until: validUntil,
        single_use: singleUse
    });
    return resp.data;
}

export async function deleteGroupInvite({ groupID, inviteID }) {
    const resp = await api.delete(`/groups/${groupID}/invites/${inviteID}`);
    return resp.data;
}

export async function fetchMembers({ groupID }) {
    const resp = await api.get(`/groups/${groupID}/members`);
    return resp.data;
}

export async function fetchAccounts({ groupID }) {
    const resp = await api.get(`/groups/${groupID}/accounts`);
    return resp.data;
}

export async function createAccount({ groupID, name, description, accountType = "personal" }) {
    const resp = await api.post(`/groups/${groupID}/accounts`, {
        name: name,
        description: description,
        type: accountType
    });
    return resp.data;
}

export async function updateAccount({ groupID, accountID, name, description }) {
    const resp = await api.post(`/groups/${groupID}/accounts/${accountID}`, {
        name: name,
        description: description
    });
    return resp.data;
}

export async function fetchTransactions({ groupID }) {
    const resp = await api.get(`/groups/${groupID}/transactions`);
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
    const resp = await api.post(`/groups/${groupID}/transactions`, {
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
    const resp = await api.post(`/groups/${groupID}/transactions/${transactionID}`, {
        description: description,
        value: value,
        currency_symbol: currencySymbol,
        currency_conversion_rate: currencyConversionRate
    });
    return resp.data;
}

export async function createOrUpdateCreditorShare({ groupID, transactionID, accountID, value }) {
    const resp = await api.post(`/groups/${groupID}/transactions/${transactionID}/creditor_shares`, {
        account_id: accountID,
        value: value
    });
    return resp.data;
}

export async function switchCreditorShare({ groupID, transactionID, accountID, value }) {
    const resp = await api.post(`/groups/${groupID}/transactions/${transactionID}/creditor_shares/switch`, {
        account_id: accountID,
        value: value
    });
    return resp.data;
}

export async function deleteCreditorShare({ groupID, transactionID, accountID }) {
    const resp = await api.delete(`/groups/${groupID}/transactions/${transactionID}/creditor_shares`, {
        data: {
            account_id: accountID
        }
    });
    return resp.data;
}

export async function createOrUpdateDebitorShare({ groupID, transactionID, accountID, value }) {
    const resp = await api.post(`/groups/${groupID}/transactions/${transactionID}/debitor_shares`, {
        account_id: accountID,
        value: value
    });
    return resp.data;
}

export async function switchDebitorShare({ groupID, transactionID, accountID, value }) {
    const resp = await api.post(`/groups/${groupID}/transactions/${transactionID}/debitor_shares/switch`, {
        account_id: accountID,
        value: value
    });
    return resp.data;
}

export async function deleteDebitorShare({ groupID, transactionID, accountID }) {
    const resp = await api.delete(`/groups/${groupID}/transactions/${transactionID}/debitor_shares`, {
        data: {
            account_id: accountID
        }
    });
    return resp.data;
}

export async function commitTransaction({ groupID, transactionID }) {
    const resp = await api.post(`/groups/${groupID}/transactions/${transactionID}/commit`);
    return resp.data;
}

export async function discardTransactionChange({ groupID, transactionID }) {
    const resp = await api.post(`/groups/${groupID}/transactions/${transactionID}/discard`);
    return resp.data;
}

export async function deleteTransaction({ groupID, transactionID }) {
    const resp = await api.delete(`/groups/${groupID}/transactions/${transactionID}`);
    return resp.data;
}

