import {
    Account,
    AccountBase,
    ClearingAccountBase,
    PersonalAccountBase,
    Transaction,
    TransactionBase,
    TransactionContainer,
    TransactionPosition,
} from "@abrechnung/types";
import deepmerge from "deepmerge";
import { BackendAccount, backendAccountToAccount } from "./accounts";
import { Client } from "./generated";
import {
    BackendTransaction,
    backendTransactionToTransaction as backendTransactionToTransactionContainer,
    toBackendPosition,
} from "./transactions";
import { IConnectionStatusProvider, IHttpError } from "./types";
import { isRequiredVersion } from "./version";

type RequestOptions = {
    withAuth?: boolean;
    useJson?: boolean;
    skipVersionCheck?: boolean;
    headers?: Record<string, string>;
} & Omit<RequestInit, "headers">;

export class HttpError implements IHttpError {
    constructor(
        public statusCode: number,
        public message: string
    ) {}
}

// accepted version range of the backend api, [min, max)
export const MIN_BACKEND_VERSION = "0.10.0";
export const MAX_BACKEND_VERSION = "0.11.0";

export class Api {
    private baseApiUrl: string;
    private accessToken?: string;
    private backendVersion?: string;

    public client: Client;

    private authenticatedResolveCallbacks: Array<() => void> = [];

    constructor(
        private connectionStatusProvider: IConnectionStatusProvider,
        baseApiUrl: string
    ) {
        this.baseApiUrl = baseApiUrl;
        this.client = this.makeClient();
    }

    private makeClient = () => {
        return new Client({ BASE: this.baseApiUrl, TOKEN: this.accessToken });
    };

    public resetAuthState = () => {
        this.accessToken = undefined;
    };

    private notifyAuthenticatedWaiters = () => {
        for (const cb of this.authenticatedResolveCallbacks) {
            cb();
        }
    };

    public init = async (accessToken?: string) => {
        if (accessToken) {
            this.setAccessToken(accessToken);
        }
        await this.checkBackendVersion();
    };

    private checkBackendVersion = async () => {
        if (this.backendVersion === undefined) {
            try {
                const version = await this.client.common.getVersion();
                this.backendVersion = version.version;
            } catch {
                // TODO: what to do here, should we propagate this error?
                return;
            }
        }
        if (!isRequiredVersion(this.backendVersion, MIN_BACKEND_VERSION, MAX_BACKEND_VERSION)) {
            throw new Error(
                `This app version is incompatible with the version your backend is running. Expected ${MIN_BACKEND_VERSION} (inclusive) to ${MAX_BACKEND_VERSION} (exclusive), but the backend is running ${this.backendVersion}`
            );
        }
    };

    public waitUntilAuthenticated = async (): Promise<void> => {
        return new Promise<void>((resolve) => {
            if (this.accessToken !== null) {
                resolve();
            } else {
                this.authenticatedResolveCallbacks.push(resolve);
            }
        });
    };

    public getAccessToken = (): string | undefined => {
        return this.accessToken;
    };

    public setAccessToken = (token: string) => {
        this.accessToken = token;
        this.client = this.makeClient();
        this.notifyAuthenticatedWaiters();
    };

    public setBaseApiUrl = (url: string) => {
        this.baseApiUrl = url;
    };

    public getBaseApiUrl = (): string => {
        return this.baseApiUrl;
    };

    public hasConnection = () => {
        return this.connectionStatusProvider.hasConnection();
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

    public uploadFile = async (transactionId: number, file: File) => {
        const resp = await this.postFile(`/api/v1/transactions/${transactionId}/files`, file);
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

    public getToken = (): string => {
        if (this.accessToken == null) {
            throw new Error("no access token present");
        }

        return this.accessToken;
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
        const token = this.getToken();

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

    private postFile = async (url: string, file: File, options: RequestOptions | null = null) => {
        console.debug("POST uploading file to", url, file);
        const formData = new FormData();
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
