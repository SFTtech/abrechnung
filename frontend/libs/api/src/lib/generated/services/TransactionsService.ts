/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NewTransaction } from '../models/NewTransaction';
import type { Transaction } from '../models/Transaction';
import type { UpdatePositionsPayload } from '../models/UpdatePositionsPayload';
import type { UpdateTransaction } from '../models/UpdateTransaction';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class TransactionsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * list all transactions in a group
     * @returns Transaction Successful Response
     * @throws ApiError
     */
    public listTransactions({
        groupId,
        minLastChanged,
        transactionIds,
    }: {
        groupId: number,
        minLastChanged?: (string | null),
        transactionIds?: (string | null),
    }): CancelablePromise<Array<Transaction>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/groups/{group_id}/transactions',
            path: {
                'group_id': groupId,
            },
            query: {
                'min_last_changed': minLastChanged,
                'transaction_ids': transactionIds,
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
     * create a new transaction
     * @returns Transaction Successful Response
     * @throws ApiError
     */
    public createTransaction({
        groupId,
        requestBody,
    }: {
        groupId: number,
        requestBody: NewTransaction,
    }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/groups/{group_id}/transactions',
            path: {
                'group_id': groupId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `unauthorized`,
                403: `forbidden`,
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * get transaction details
     * @returns Transaction Successful Response
     * @throws ApiError
     */
    public getTransaction({
        groupId,
        transactionId,
    }: {
        groupId: number,
        transactionId: number,
    }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/groups/{group_id}/transactions/{transaction_id}',
            path: {
                'group_id': groupId,
                'transaction_id': transactionId,
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
     * update transaction details
     * @returns Transaction Successful Response
     * @throws ApiError
     */
    public updateTransaction({
        groupId,
        transactionId,
        requestBody,
    }: {
        groupId: number,
        transactionId: number,
        requestBody: UpdateTransaction,
    }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/groups/{group_id}/transactions/{transaction_id}',
            path: {
                'group_id': groupId,
                'transaction_id': transactionId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `unauthorized`,
                403: `forbidden`,
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * delete a transaction
     * @returns Transaction Successful Response
     * @throws ApiError
     */
    public deleteTransaction({
        groupId,
        transactionId,
    }: {
        groupId: number,
        transactionId: number,
    }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/api/v1/groups/{group_id}/transactions/{transaction_id}',
            path: {
                'group_id': groupId,
                'transaction_id': transactionId,
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
     * update transaction positions
     * @returns Transaction Successful Response
     * @throws ApiError
     */
    public updateTransactionPositions({
        groupId,
        transactionId,
        requestBody,
    }: {
        groupId: number,
        transactionId: number,
        requestBody: UpdatePositionsPayload,
    }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/groups/{group_id}/transactions/{transaction_id}/positions',
            path: {
                'group_id': groupId,
                'transaction_id': transactionId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `unauthorized`,
                403: `forbidden`,
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * fetch the (binary) contents of a transaction attachment
     * @returns any Successful Response
     * @throws ApiError
     */
    public getFileContents({
        fileId,
        blobId,
    }: {
        fileId: number,
        blobId: number,
    }): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/files/{file_id}/{blob_id}',
            path: {
                'file_id': fileId,
                'blob_id': blobId,
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
