import { backendUserToUser, validateJWTToken } from "./auth";
import deepmerge from "deepmerge";
import {
    Account,
    AccountBase,
    Group,
    GroupInvite,
    GroupMember,
    GroupLogEntry,
    TransactionPosition,
    Transaction,
    TransactionContainer,
    TransactionBase,
    GroupBase,
    PersonalAccountBase,
    ClearingAccountBase,
} from "@abrechnung/types";
import { BackendAccount, backendAccountToAccount } from "./accounts";
import {
    BackendTransaction,
    backendTransactionToTransaction as backendTransactionToTransactionContainer,
    toBackendPosition,
} from "./transactions";
import {
    BackendGroup,
    BackendGroupMember,
    backendGroupToGroup,
    backendInviteToInvite,
    backendMemberToMember,
    backendLogEntryToLogEntry,
    BackendGroupInvite,
    BackendGroupLogEntry,
    backendGroupPreviewToPreview,
} from "./groups";
import { IConnectionStatusProvider, IHttpError } from "./types";
import { isRequiredVersion, SemVersion } from "./version";

type RequestOptions = {
    withAuth?: boolean;
    useJson?: boolean;
    skipVersionCheck?: boolean;
    headers?: Record<string, string>;
} & Omit<RequestInit, "headers">;

export class HttpError implements IHttpError {
    constructor(public statusCode: number, public message: string) {}
}

export const MIN_BACKEND_VERSION = "0.9.0";
export const MAX_BACKEND_VERSION = "0.9.0";

export class Api {
    private baseApiUrl: string | null = null;
    private sessionToken: string | null = null;
    private accessToken: string | null = null;
    private backendVersion: string | null = null;

    constructor(private connectionStatusProvider: IConnectionStatusProvider) {}

    public resetAuthState = () => {
        this.sessionToken = null;
        // this.accessToken = null; // we do not null the access token s.t. we can perform remaining requests
    };

    public init = async (baseApiUrl: string, sessionToken?: string) => {
        this.baseApiUrl = baseApiUrl;

        if (sessionToken) {
            this.sessionToken = sessionToken;
        }
        await this.checkBackendVersion();
    };

    private checkBackendVersion = async () => {
        if (this.backendVersion === null) {
            try {
                const version = await this.getVersion();
                this.backendVersion = version.version;
            } catch {
                // TODO: what to do here, should we propagate this error?
                return;
            }
        }
        if (!isRequiredVersion(this.backendVersion, MIN_BACKEND_VERSION, MAX_BACKEND_VERSION)) {
            throw new Error(
                `This app version is incompatible with the version your backend is running. Expected ${MIN_BACKEND_VERSION} - ${MAX_BACKEND_VERSION}, but the backend is running ${this.backendVersion}`
            );
        }
    };

    public getAccessToken = (): string | null => {
        return this.accessToken;
    };

    public setBaseApiUrl = (url: string) => {
        this.baseApiUrl = url;
    };

    public getBaseApiUrl = (): string | null => {
        return this.baseApiUrl;
    };

    public setSessionToken = (token: string) => {
        this.sessionToken = token;
    };

    public getSessionToken = (): string | null => {
        return this.sessionToken;
    };

    public hasConnection = () => {
        return this.connectionStatusProvider.hasConnection();
    };

    public updateAccessToken = async (): Promise<string | null> => {
        if (this.sessionToken === null) {
            return null;
        }
        const resp = await fetch(`${this.baseApiUrl}/api/v1/auth/fetch_access_token`, {
            method: "POST",
            body: JSON.stringify({ token: this.sessionToken }),
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (!resp.ok) {
            const body = await resp.text();
            console.log("error on fetching new access token", body);
            return null;
        }
        // TODO: error handling
        const jsonResp = await resp.json();
        this.accessToken = jsonResp.access_token;
        return jsonResp.access_token;
    };

    public getVersion = async (): Promise<SemVersion> => {
        const resp = await this.makeGet("/api/version", { withAuth: false, skipVersionCheck: true });
        return {
            version: resp.version,
            major: Number(resp.major_version),
            minor: Number(resp.minor_version),
            patch: Number(resp.patch_version),
        };
    };

    public fetchGroups = async (): Promise<Group[]> => {
        const groups = await this.makeGet("/api/v1/groups");
        return groups.map((group: BackendGroup) => backendGroupToGroup(group));
    };

    public fetchGroup = async (groupID: number): Promise<Group> => {
        const group = await this.makeGet(`/api/v1/groups/${groupID}`);
        return backendGroupToGroup(group);
    };

    public fetchGroupPreview = async (token: string) => {
        const resp = await this.makePost(`/api/v1/groups/preview`, {
            invite_token: token,
        });
        return backendGroupPreviewToPreview(resp);
    };

    public createGroup = async (group: Omit<GroupBase, "id">): Promise<Group> => {
        const resp = await this.makePost("/api/v1/groups", {
            name: group.name,
            description: group.description,
            currency_symbol: group.currencySymbol,
            terms: group.terms,
            add_user_account_on_join: group.addUserAccountOnJoin,
        });
        return backendGroupToGroup(resp);
    };

    public updateGroupMetadata = async (group: GroupBase): Promise<Group> => {
        const resp = await this.makePost(`/api/v1/groups/${group.id}`, {
            name: group.name,
            description: group.description,
            currency_symbol: group.currencySymbol,
            terms: group.terms,
            add_user_account_on_join: group.addUserAccountOnJoin,
        });
        return backendGroupToGroup(resp);
    };

    public leaveGroup = async (groupID: number) => {
        return await this.makePost(`/api/v1/groups/${groupID}/leave`);
    };

    public deleteGroup = async (groupID: number) => {
        return await this.makeDelete(`/api/v1/groups/${groupID}`);
    };

    public joinGroup = async (token: string) => {
        return await this.makePost(`/api/v1/groups/join`, {
            invite_token: token,
        });
    };

    public fetchGroupMembers = async (groupID: number): Promise<GroupMember[]> => {
        const members = await this.makeGet(`/api/v1/groups/${groupID}/members`);
        return members.map((member: BackendGroupMember) => backendMemberToMember(member));
    };

    public updateGroupMemberPrivileges = async (args: {
        groupId: number;
        userId: number;
        isOwner: boolean;
        canWrite: boolean;
    }) => {
        const member = await this.makePost(`/api/v1/groups/${args.groupId}/members`, {
            user_id: args.userId,
            is_owner: args.isOwner,
            can_write: args.canWrite,
        });
        return backendMemberToMember(member);
    };

    public fetchGroupLog = async (groupID: number): Promise<GroupLogEntry[]> => {
        const log = await this.makeGet(`/api/v1/groups/${groupID}/logs`);
        return log.map((l: BackendGroupLogEntry) => backendLogEntryToLogEntry(l));
    };

    public sendGroupMessage = async (groupID: number, message: string) => {
        return await this.makePost(`/api/v1/groups/${groupID}/send_message`, {
            message: message,
        });
    };

    public fetchGroupInvites = async (groupID: number): Promise<GroupInvite[]> => {
        const log = await this.makeGet(`/api/v1/groups/${groupID}/invites`);
        return log.map((i: BackendGroupInvite) => backendInviteToInvite(i));
    };

    public createGroupInvite = async (
        groupID: number,
        description: string,
        validUntil: string,
        singleUse: boolean,
        joinAsEditor: boolean
    ) => {
        return await this.makePost(`/api/v1/groups/${groupID}/invites`, {
            description: description,
            valid_until: validUntil,
            single_use: singleUse,
            join_as_editor: joinAsEditor,
        });
    };

    public deleteGroupInvite = async (groupID: number, inviteID: number) => {
        return await this.makeDelete(`/api/v1/groups/${groupID}/invites/${inviteID}`);
    };

    public fetchAccounts = async (groupID: number): Promise<Account[]> => {
        const accounts = await this.makeGet(`/api/v1/groups/${groupID}/accounts`);
        return accounts.map((acc: BackendAccount) => backendAccountToAccount(acc));
    };

    public fetchAccount = async (accountID: number): Promise<Account> => {
        const account = await this.makeGet(`/api/v1/accounts/${accountID}`);
        return backendAccountToAccount(account);
    };

    public createAccount = async (account: Omit<AccountBase, "id" | "deleted">): Promise<Account> => {
        // TODO: figure out why typescript does not like this
        const updatedAccount = await this.makePost(`/api/v1/groups/${account.groupID}/accounts`, {
            type: account.type,
            name: account.name,
            description: account.description,
            owning_user_id: account.type === "personal" ? (account as PersonalAccountBase).owningUserID : null,
            clearing_shares: account.type === "clearing" ? (account as ClearingAccountBase).clearingShares : null,
            tags: account.type === "clearing" ? (account as ClearingAccountBase).tags : null,
            date_info: account.type === "clearing" ? (account as ClearingAccountBase).dateInfo : null,
        });
        return backendAccountToAccount(updatedAccount);
    };

    public updateAccountDetails = async <T extends AccountBase>(account: T): Promise<Account> => {
        const updatedAccount = await this.makePost(`/api/v1/accounts/${account.id}`, {
            name: account.name,
            description: account.description,
            owning_user_id: account.type === "personal" ? account.owningUserID : null,
            clearing_shares: account.type === "clearing" ? account.clearingShares : null,
            tags: account.type === "clearing" ? account.tags : null,
            date_info: account.type === "clearing" ? account.dateInfo : null,
        });
        return backendAccountToAccount(updatedAccount);
    };

    public pushAccountChanges = async <T extends AccountBase>(account: T): Promise<Account> => {
        if (account.id < 0) {
            const updatedAccount = await this.makePost(`/api/v1/groups/${account.groupID}/accounts`, {
                type: account.type,
                name: account.name,
                description: account.description,
                owning_user_id: account.type === "personal" ? account.owningUserID : null,
                clearing_shares: account.type === "clearing" ? account.clearingShares : null,
                tags: account.type === "clearing" ? account.tags : null,
                date_info: account.type === "clearing" ? account.dateInfo : null,
            });
            return backendAccountToAccount(updatedAccount);
        } else {
            const updatedAccount = await this.makePost(`/api/v1/accounts/${account.id}`, {
                name: account.name,
                description: account.description,
                owning_user_id: account.type === "personal" ? account.owningUserID : null,
                clearing_shares: account.type === "clearing" ? account.clearingShares : null,
                tags: account.type === "clearing" ? account.tags : null,
                date_info: account.type === "clearing" ? account.dateInfo : null,
            });
            return backendAccountToAccount(updatedAccount);
        }
    };

    public syncAccountsBatch = async (groupId: number, accounts: Account[]): Promise<{ [k: number]: number }[]> => {
        return await this.makePost(`/api/v1/groups/${groupId}/accounts/sync`, accounts);
    };

    public discardAccountChange = async (accountId: number): Promise<Account> => {
        const resp = await this.makePost(`/api/v1/accounts/${accountId}/discard`);
        return backendAccountToAccount(resp);
    };

    public deleteAccount = async (accountId: number): Promise<Account> => {
        const resp = await this.makeDelete(`/api/v1/accounts/${accountId}`);
        return backendAccountToAccount(resp);
    };

    public fetchTransactions = async (
        groupId: number,
        minLastChanged?: Date,
        additionalTransactions?: number[]
    ): Promise<TransactionContainer[]> => {
        let url = `/api/v1/groups/${groupId}/transactions`;
        if (minLastChanged) {
            url += "?min_last_changed=" + encodeURIComponent(minLastChanged.toISOString());
            if (additionalTransactions && additionalTransactions.length > 0) {
                url += "&transaction_ids=" + additionalTransactions.join(",");
            }
        }
        const transactions = await this.makeGet(url);
        return transactions.map((t: BackendTransaction) => backendTransactionToTransactionContainer(t));
    };

    public fetchTransaction = async (transactionId: number): Promise<TransactionContainer> => {
        const transaction = await this.makeGet(`/api/v1/transactions/${transactionId}`);
        return backendTransactionToTransactionContainer(transaction);
    };

    public createTransaction = async (
        transaction: Omit<TransactionBase, "id" | "deleted" | "positions" | "attachments">,
        performCommit = false
    ): Promise<TransactionContainer> => {
        const resp = await this.makePost(`/api/v1/groups/${transaction.groupID}/transactions`, {
            name: transaction.name,
            description: transaction.description,
            value: transaction.value,
            type: transaction.type,
            tags: transaction.tags,
            billed_at: transaction.billedAt,
            currency_symbol: transaction.currencySymbol,
            currency_conversion_rate: transaction.currencyConversionRate,
            creditor_shares: transaction.creditorShares,
            debitor_shares: transaction.debitorShares,
            perform_commit: performCommit,
        });
        return backendTransactionToTransactionContainer(resp);
    };

    public updateTransactionPositions = async (
        transactionId: number,
        positions: TransactionPosition[],
        performCommit = true
    ) => {
        const payload = {
            perform_commit: performCommit,
            positions: toBackendPosition(positions),
        };
        return await this.makePost(`/api/v1/transactions/${transactionId}/positions`, payload);
    };

    public pushTransactionChanges = async (
        transaction: Transaction,
        positions: TransactionPosition[],
        performCommit = true
    ): Promise<TransactionContainer> => {
        if (transaction.id < 0) {
            const updatedTransaction = await this.makePost(`/api/v1/groups/${transaction.groupID}/transactions`, {
                name: transaction.name,
                description: transaction.description,
                value: transaction.value,
                type: transaction.type,
                billed_at: transaction.billedAt,
                currency_symbol: transaction.currencySymbol,
                currency_conversion_rate: transaction.currencyConversionRate,
                tags: transaction.tags,
                creditor_shares: transaction.creditorShares,
                debitor_shares: transaction.debitorShares,
                positions: transaction.type === "purchase" ? toBackendPosition(positions) : null,
                perform_commit: performCommit,
            });
            return backendTransactionToTransactionContainer(updatedTransaction);
        } else {
            const updatedTransaction = await this.makePost(`/api/v1/transactions/${transaction.id}`, {
                name: transaction.name,
                description: transaction.description,
                value: transaction.value,
                billed_at: transaction.billedAt,
                currency_symbol: transaction.currencySymbol,
                currency_conversion_rate: transaction.currencyConversionRate,
                tags: transaction.tags,
                creditor_shares: transaction.creditorShares,
                debitor_shares: transaction.debitorShares,
                positions: transaction.type === "purchase" ? toBackendPosition(positions) : null,
                perform_commit: performCommit,
            });
            return backendTransactionToTransactionContainer(updatedTransaction);
        }
    };

    public pushTransactionPositionChanges = async (
        transactionId: number,
        positions: TransactionPosition[],
        performCommit = true
    ): Promise<TransactionContainer> => {
        const payload = {
            perform_commit: performCommit,
            positions: toBackendPosition(positions),
        };
        const resp = await this.makePost(`/api/v1/transactions/${transactionId}/positions`, payload);
        return backendTransactionToTransactionContainer(resp);
    };

    public uploadFile = async (transactionId: number, filename: string, file: File) => {
        const resp = await this.postFile(`/api/v1/transactions/${transactionId}/files`, filename, file);
        return backendTransactionToTransactionContainer(resp);
    };

    public fetchFile = async (fileId: number, blobId: number): Promise<string> => {
        const headers = await this.makeAuthHeader();
        const resp = await fetch(`${this.baseApiUrl}/api/v1/files/${fileId}/${blobId}`, {
            headers: headers,
            method: "GET",
        });
        if (!resp.ok) {
            const body = await resp.text();
            try {
                const error = JSON.parse(body);
                throw new HttpError(resp.status, error.msg);
            } catch (e) {
                if (e instanceof HttpError) {
                    throw e;
                }
                throw new HttpError(resp.status, `Error on fetching file`);
            }
        }
        try {
            const blob = await resp.blob();
            return URL.createObjectURL(blob);
        } catch {
            console.warn(`Error on fetching file, no blob`);
            throw new HttpError(resp.status, `Error on fetching file, no blob`);
        }
    };

    public deleteFile = async (fileId: number) => {
        return await this.makeDelete(`/api/v1/files/${fileId}`);
    };

    public commitTransaction = async (transactionId: number): Promise<TransactionContainer> => {
        const resp = await this.makePost(`/api/v1/transactions/${transactionId}/commit`);
        return backendTransactionToTransactionContainer(resp);
    };

    public createTransactionChange = async (transactionId: number): Promise<TransactionContainer> => {
        const resp = await this.makePost(`/api/v1/transactions/${transactionId}/new_change`);
        return backendTransactionToTransactionContainer(resp);
    };

    public discardTransactionChange = async (transactionId: number): Promise<TransactionContainer> => {
        const resp = await this.makePost(`/api/v1/transactions/${transactionId}/discard`);
        return backendTransactionToTransactionContainer(resp);
    };

    public deleteTransaction = async (transactionId: number): Promise<TransactionContainer> => {
        const resp = await this.makeDelete(`/api/v1/transactions/${transactionId}`);
        return backendTransactionToTransactionContainer(resp);
    };

    public login = async (
        username: string,
        password: string,
        sessionName: string
    ): Promise<{ sessionToken: string; accessToken: string; baseUrl: string }> => {
        const resp = await this.makePost(
            "/api/v1/auth/login",
            { username: username, password: password, session_name: sessionName },
            { withAuth: false }
        );

        this.accessToken = resp.access_token;
        this.sessionToken = resp.session_token;

        return {
            accessToken: resp.access_token,
            sessionToken: resp.session_token,
            baseUrl: this.baseApiUrl as string,
        };
    };

    public logout = async () => {
        const resp = await this.makePost("/api/v1/auth/logout");
        this.resetAuthState();
        return resp;
    };

    public register = async (username: string, email: string, password: string, inviteToken?: string) => {
        return await this.makePost(
            "/api/v1/auth/register",
            {
                username: username,
                email: email,
                password: password,
                invite_token: inviteToken,
            },
            { withAuth: false }
        );
    };

    public fetchProfile = async () => {
        const resp = await this.makeGet("/api/v1/profile");
        return backendUserToUser(resp);
    };

    public deleteSession = async (sessionID: string) => {
        return await this.makePost("/api/v1/auth/delete_session", {
            session_id: sessionID,
        });
    };

    public renameSession = async (sessionID: string, name: string) => {
        return await this.makePost("/api/v1/auth/rename_session", {
            session_id: sessionID,
            name: name,
        });
    };

    public requestPasswordRecovery = async (email: string) => {
        return await this.makePost("/api/v1/auth/recover_password", { email: email }, { withAuth: false });
    };

    public confirmPasswordRecovery = async ({ token, newPassword }: { token: string; newPassword: string }) => {
        return await this.makePost(
            "/api/v1/auth/confirm_password_recovery",
            {
                token: token,
                new_password: newPassword,
            },
            { withAuth: false }
        );
    };

    public changeEmail = async ({ password, newEmail }: { password: string; newEmail: string }) => {
        return await this.makePost("/api/v1/profile/change_email", {
            password: password,
            email: newEmail,
        });
    };

    public changePassword = async ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) => {
        return await this.makePost("/api/v1/profile/change_password", {
            old_password: oldPassword,
            new_password: newPassword,
        });
    };

    public confirmRegistration = async (token: string) => {
        return await this.makePost(
            "/api/v1/auth/confirm_registration",
            {
                token: token,
            },
            {
                withAuth: false,
            }
        );
    };

    public confirmEmailChange = async (token: string) => {
        return await this.makePost(
            "/api/v1/auth/confirm_email_change",
            {
                token: token,
            },
            {
                withAuth: false,
            }
        );
    };

    public confirmPasswordReset = async (token: string) => {
        return await this.makePost(
            "/api/v1/auth/confirm_password_reset",
            {
                token: token,
            },
            {
                withAuth: false,
            }
        );
    };

    public getToken = async (): Promise<string> => {
        if (this.sessionToken === null && this.accessToken !== null && validateJWTToken(this.accessToken)) {
            return this.accessToken;
        }

        if (this.sessionToken === null) {
            throw new Error("no session token present");
        }

        if (this.accessToken === null || !validateJWTToken(this.accessToken)) {
            this.accessToken = await this.updateAccessToken();
            console.log("fetched new access token", this.accessToken);
            if (this.accessToken !== null) {
                return this.accessToken;
            }
            throw new Error("no access token present");
        }
        if (this.accessToken !== null) {
            return this.accessToken;
        }
        throw new Error("no access token present");
    };

    public getTokenJSON = (): { userID: number } | null => {
        if (this.accessToken == null) {
            return null;
        }
        const parsedToken = JSON.parse(atob(this.accessToken.split(".")[1]));
        const { user_id: userID } = parsedToken;
        return { userID };
    };

    private makeAuthHeader = async () => {
        // TODO: find out currently valid abrechnung instance
        const token = await this.getToken();

        // TODO: check result
        return {
            Authorization: `Bearer ${token}`,
        };
    };

    private fetchJson = async (url: string, options: RequestOptions) => {
        console.debug("Request to", url, "options", options);
        let headers: Record<string, string> = {};
        if (!options.skipVersionCheck) {
            await this.checkBackendVersion();
        }
        if (options.withAuth) {
            const authHeaders = await this.makeAuthHeader();
            headers = {
                ...authHeaders,
            };
        }
        if (options.useJson ?? true) {
            headers["Content-Type"] = "application/json";
        }
        const resp = await fetch(url, {
            headers: options.headers ? deepmerge(options.headers, headers) : headers,
            ...options,
        });
        if (!resp.ok) {
            const body = await resp.text();
            try {
                const error = JSON.parse(body);
                console.warn(`Error ${error.code} on ${options.method} to ${url}: ${error.msg}`);
                throw new HttpError(resp.status, error.msg);
            } catch (e) {
                if (e instanceof HttpError) {
                    throw e;
                }
                console.warn(`Error on ${options.method} to ${url}: ${body}`);
                throw new HttpError(resp.status, `Error on ${options.method} to ${url}: ${body}`);
            }
        }
        try {
            if (resp.status === 204) {
                return {};
            }
            return resp.json();
        } catch {
            console.warn(`Error on ${options.method} to ${url}: invalid json`);
            throw new HttpError(resp.status, `Error on ${options.method} to ${url}: invalid json`);
        }
    };

    private postFile = async (url: string, filename: string, file: File, options: RequestOptions | null = null) => {
        console.debug("POST uploading file to", url, file);
        const formData = new FormData();
        formData.append("filename", filename);
        formData.append("file", file);
        return await this.fetchJson(`${this.baseApiUrl}${url}`, {
            method: "POST",
            body: formData,
            withAuth: true,
            ...options,
            useJson: false,
        });
    };

    private makePost = async (url: string, data: object | null = null, options: RequestOptions | null = null) => {
        console.debug("POST to", url, "with data", data);
        return await this.fetchJson(`${this.baseApiUrl}${url}`, {
            method: "POST",
            body: data == null ? undefined : JSON.stringify(data),
            withAuth: true,
            ...options,
        });
    };

    private makeGet = async (url: string, options: RequestOptions | null = null) => {
        return await this.fetchJson(`${this.baseApiUrl}${url}`, {
            method: "GET",
            withAuth: true,
            ...options,
        });
    };

    private makeDelete = async (url: string, data: object | null = null, options: RequestOptions | null = null) => {
        console.debug("DELETE to", url, "with data", data);
        return await this.fetchJson(`${this.baseApiUrl}${url}`, {
            method: "DELETE",
            body: JSON.stringify(data),
            withAuth: true,
            ...options,
        });
    };
}
