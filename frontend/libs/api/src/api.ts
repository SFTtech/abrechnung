import { IApi } from "./types";
import { validateJWTToken } from "./auth";
import deepmerge from "deepmerge";
import { Account, Group, Transaction, TransactionPosition } from "@abrechnung/types";
import { backendAccountToAccount } from "./accounts";
import { backendTransactionToTransaction, toBackendPosition } from "./transactions";
import { toISODateString } from "@abrechnung/utils";

export class Api implements IApi {
    baseApiUrl: string | null = null;
    sessionToken: string | null = null;
    accessToken: string | null = null;

    public updateAccessToken = async () => {
        console.log("request to ", `${this.baseApiUrl}/auth/fetch_access_token`);
        const resp = await fetch(`${this.baseApiUrl}/auth/fetch_access_token`, {
            method: "POST",
            body: JSON.stringify({ token: this.sessionToken }),
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (!resp.ok) {
            const body = await resp.text();
            console.log("error on fetching new access token", body);
            return;
        }
        // TODO: error handling
        const jsonResp = await resp.json();
        this.accessToken = jsonResp.access_token;
        return jsonResp.access_token;
    };

    public fetchGroups = async (): Promise<Group[]> => {
        return await this.makeGet("/groups");
    };

    public fetchGroup = async (groupID: number): Promise<Group> => {
        return await this.makeGet(`/groups/${groupID}`);
    };

    public fetchAccounts = async (groupID: number): Promise<Account[]> => {
        const accounts = await this.makeGet(`/groups/${groupID}/accounts`);
        return accounts.map((acc: any) => backendAccountToAccount(acc));
    };

    public fetchAccount = async (accountID: number): Promise<Account> => {
        const account = await this.makeGet(`/accounts/${accountID}`);
        return backendAccountToAccount(account);
    };

    public pushAccountChanges = async (account: Account) => {
        if (account.id < 0) {
            const updatedAccount = await this.makePost(`/groups/${account.group_id}/accounts`, {
                type: account.type,
                name: account.name,
                description: account.description,
                owning_user_id: account.owning_user_id,
                clearing_shares: account.clearing_shares,
            });
            return backendAccountToAccount(updatedAccount);
        } else {
            const updatedAccount = await this.makePost(`/accounts/${account.id}`, {
                name: account.name,
                description: account.description,
                owning_user_id: account.owning_user_id,
                clearing_shares: account.clearing_shares,
            });
            return backendAccountToAccount(updatedAccount);
        }
    };

    public deleteAccount = async (accountID: number): Promise<void> => {
        return await this.makeDelete(`/accounts/${accountID}`);
    };

    public fetchTransactions = async (
        groupID: number,
        minLastChanged: Date | null = null,
        additionalTransactions: Array<number> | null = null
    ): Promise<[Transaction, TransactionPosition[]][]> => {
        let url = `/groups/${groupID}/transactions`;
        if (minLastChanged) {
            url += "?min_last_changed=" + encodeURIComponent(minLastChanged.toISOString());
            if (additionalTransactions && additionalTransactions.length > 0) {
                url += "&transaction_ids=" + additionalTransactions.join(",");
            }
        }
        const transactions = await this.makeGet(url);
        return transactions.map((t: any) => backendTransactionToTransaction(t));
    };

    public fetchTransaction = async (transactionID: number): Promise<[Transaction, TransactionPosition[]]> => {
        const transaction = await this.makeGet(`/transactions/${transactionID}`);
        return backendTransactionToTransaction(transaction);
    };

    public pushTransactionChanges = async (
        transaction: Transaction,
        positions: TransactionPosition[],
        performCommit = true
    ): Promise<[Transaction, TransactionPosition[]]> => {
        if (transaction.id < 0) {
            const updatedTransaction = await this.makePost(`/groups/${transaction.group_id}/transactions`, {
                description: transaction.description,
                value: transaction.value,
                type: transaction.type,
                billed_at: toISODateString(transaction.billed_at),
                currency_symbol: transaction.currency_symbol,
                currency_conversion_rate: transaction.currency_conversion_rate,
                creditor_shares: transaction.creditor_shares,
                debitor_shares: transaction.debitor_shares,
                positions: toBackendPosition(positions),
                perform_commit: performCommit,
            });
            return backendTransactionToTransaction(updatedTransaction);
        } else {
            const updatedTransaction = await this.makePost(`/transactions/${transaction.id}`, {
                description: transaction.description,
                value: transaction.value,
                billed_at: toISODateString(transaction.billed_at),
                currency_symbol: transaction.currency_symbol,
                currency_conversion_rate: transaction.currency_conversion_rate,
                creditor_shares: transaction.creditor_shares,
                debitor_shares: transaction.debitor_shares,
                positions: toBackendPosition(positions),
                perform_commit: performCommit,
            });
            return backendTransactionToTransaction(updatedTransaction);
        }
    };

    public pushTransactionPositionChanges = async (
        transactionID: number,
        positions: TransactionPosition[],
        performCommit = true
    ) => {
        const payload = {
            perform_commit: performCommit,
            positions: toBackendPosition(positions),
        };
        return await this.makePost(`/transactions/${transactionID}/positions`, payload);
    };

    public uploadFile = async (transactionID: number, filename: string, file: any, onUploadProgress: any) => {
        const formData = new FormData();

        formData.append("file", file);
        formData.append("filename", filename);

        return await this.makePost(`/transactions/${transactionID}/files`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            onUploadProgress,
        });
    };

    public fetchFile = async (fileID: number, blobID: number) => {
        return await this.makeGet(`/files/${fileID}/${blobID}`, {
            responseType: "blob",
        });
    };

    public deleteFile = async (fileID: number) => {
        return await this.makeDelete(`/files/${fileID}`);
    };

    public commitTransaction = async (transactionID: number) => {
        return await this.makePost(`/transactions/${transactionID}/commit`);
    };

    public createTransactionChange = async (transactionID: number) => {
        return await this.makePost(`/transactions/${transactionID}/new_change`);
    };

    public discardTransactionChange = async (transactionID: number) => {
        return await this.makePost(`/transactions/${transactionID}/discard`);
    };

    public deleteTransaction = async (transactionID: number) => {
        return await this.makeDelete(`/transactions/${transactionID}`);
    };

    public logout = async () => {
        return await this.makePost("/auth/logout");
    };

    private makeAuthHeader = async () => {
        // TODO: find out currently valid abrechnung instance
        if (this.sessionToken === null || this.accessToken === null || !validateJWTToken(this.accessToken)) {
            this.accessToken = await this.updateAccessToken();
            console.log("fetched new access token", this.accessToken);
        }

        // TODO: check result
        return {
            Authorization: `Bearer ${this.accessToken}`,
        };
    };

    private fetchJson = async (url: string, options: RequestInit) => {
        const authHeaders = await this.makeAuthHeader();
        try {
            const resp = await fetch(
                url,
                deepmerge(
                    {
                        headers: {
                            "Content-Type": "application/json",
                            ...authHeaders,
                        },
                    },
                    options
                )
            );
            if (!resp.ok) {
                const body = await resp.text();
                try {
                    const error = JSON.parse(body);
                    console.log(`Error ${error.code} on ${options.method} to ${url}: ${error.msg}`);
                    throw Error(`Error ${error.code} on ${options.method} to ${url}: ${error.msg}`);
                } catch {
                    console.log(`Error on ${options.method} to ${url}: ${body}`);
                    throw Error(`Error on ${options.method} to ${url}: ${body}`);
                }
            }
            try {
                return resp.json();
            } catch {
                console.log(`Error on ${options.method} to ${url}: invalid json`);
                throw Error(`Error on ${options.method} to ${url}: invalid json`);
            }
        } catch (err) {
            if (err instanceof Error) {
                throw Error(`Error on ${options.method} to ${url}: ${err.toString()}`);
            } else {
                throw Error(`Error on ${options.method} to ${url}: ${err}`);
            }
        }
    };

    private makePost = async (url: string, data: object | null = null, options: RequestInit | null = null) => {
        console.log("POST to", url, "with data", data);
        return await this.fetchJson(`${this.baseApiUrl}${url}`, {
            method: "POST",
            body: JSON.stringify(data),
            ...options,
        });
    };

    private makeGet = async (url: string, options: RequestInit | null = null) => {
        return await this.fetchJson(`${this.baseApiUrl}${url}`, {
            method: "GET",
            ...options,
        });
    };

    private makeDelete = async (url: string, data: object | null = null, options: RequestInit | null = null) => {
        return await this.fetchJson(`${this.baseApiUrl}${url}`, {
            method: "GET",
            body: JSON.stringify(data),
            ...options,
        });
    };
}
