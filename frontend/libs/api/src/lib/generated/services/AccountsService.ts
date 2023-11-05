/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClearingAccount } from "../models/ClearingAccount";
import type { NewAccount } from "../models/NewAccount";
import type { PersonalAccount } from "../models/PersonalAccount";

import type { CancelablePromise } from "../core/CancelablePromise";
import type { BaseHttpRequest } from "../core/BaseHttpRequest";

export class AccountsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * list all accounts in a group
     * @returns any Successful Response
     * @throws ApiError
     */
    public listAccounts({ groupId }: { groupId: number }): CancelablePromise<Array<ClearingAccount | PersonalAccount>> {
        return this.httpRequest.request({
            method: "GET",
            url: "/api/v1/groups/{group_id}/accounts",
            path: {
                group_id: groupId,
            },
            errors: {
                401: `unauthorized`,
                403: `forbidden`,
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }

    /**
     * create a new group account
     * @returns any Successful Response
     * @throws ApiError
     */
    public createAccount({
        groupId,
        requestBody,
    }: {
        groupId: number;
        requestBody: NewAccount;
    }): CancelablePromise<ClearingAccount | PersonalAccount> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/groups/{group_id}/accounts",
            path: {
                group_id: groupId,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                401: `unauthorized`,
                403: `forbidden`,
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }

    /**
     * fetch a group account
     * @returns any Successful Response
     * @throws ApiError
     */
    public getAccount({ accountId }: { accountId: number }): CancelablePromise<ClearingAccount | PersonalAccount> {
        return this.httpRequest.request({
            method: "GET",
            url: "/api/v1/accounts/{account_id}",
            path: {
                account_id: accountId,
            },
            errors: {
                401: `unauthorized`,
                403: `forbidden`,
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }

    /**
     * update an account
     * @returns any Successful Response
     * @throws ApiError
     */
    public updateAccount({
        accountId,
        requestBody,
    }: {
        accountId: number;
        requestBody: NewAccount;
    }): CancelablePromise<ClearingAccount | PersonalAccount> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/accounts/{account_id}",
            path: {
                account_id: accountId,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                401: `unauthorized`,
                403: `forbidden`,
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }

    /**
     * delete an account
     * @returns any Successful Response
     * @throws ApiError
     */
    public deleteAccount({ accountId }: { accountId: number }): CancelablePromise<ClearingAccount | PersonalAccount> {
        return this.httpRequest.request({
            method: "DELETE",
            url: "/api/v1/accounts/{account_id}",
            path: {
                account_id: accountId,
            },
            errors: {
                401: `unauthorized`,
                403: `forbidden`,
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
