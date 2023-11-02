/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_file } from "../models/Body_upload_file";
import type { RawTransaction } from "../models/RawTransaction";
import type { Transaction } from "../models/Transaction";
import type { TransactionCreatePayload } from "../models/TransactionCreatePayload";
import type { TransactionUpdatePayload } from "../models/TransactionUpdatePayload";
import type { UpdatePositionsPayload } from "../models/UpdatePositionsPayload";

import type { CancelablePromise } from "../core/CancelablePromise";
import type { BaseHttpRequest } from "../core/BaseHttpRequest";

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
        groupId: number;
        minLastChanged?: string | null;
        transactionIds?: string | null;
    }): CancelablePromise<Array<Transaction>> {
        return this.httpRequest.request({
            method: "GET",
            url: "/api/v1/groups/{group_id}/transactions",
            path: {
                group_id: groupId,
            },
            query: {
                min_last_changed: minLastChanged,
                transaction_ids: transactionIds,
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
        groupId: number;
        requestBody: TransactionCreatePayload;
    }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/groups/{group_id}/transactions",
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
     * sync a batch of transactions
     * @returns number Successful Response
     * @throws ApiError
     */
    public syncTransactions({
        groupId,
        requestBody,
    }: {
        groupId: number;
        requestBody: Array<RawTransaction>;
    }): CancelablePromise<Record<string, number>> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/groups/{group_id}/transactions/sync",
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
     * get transaction details
     * @returns Transaction Successful Response
     * @throws ApiError
     */
    public getTransaction({ transactionId }: { transactionId: number }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: "GET",
            url: "/api/v1/transactions/{transaction_id}",
            path: {
                transaction_id: transactionId,
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
        transactionId,
        requestBody,
    }: {
        transactionId: number;
        requestBody: TransactionUpdatePayload;
    }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/transactions/{transaction_id}",
            path: {
                transaction_id: transactionId,
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
     * delete a transaction
     * @returns Transaction Successful Response
     * @throws ApiError
     */
    public deleteTransaction({ transactionId }: { transactionId: number }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: "DELETE",
            url: "/api/v1/transactions/{transaction_id}",
            path: {
                transaction_id: transactionId,
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
        transactionId,
        requestBody,
    }: {
        transactionId: number;
        requestBody: UpdatePositionsPayload;
    }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/transactions/{transaction_id}/positions",
            path: {
                transaction_id: transactionId,
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
     * commit currently pending transaction changes
     * @returns Transaction Successful Response
     * @throws ApiError
     */
    public commitTransaction({ transactionId }: { transactionId: number }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/transactions/{transaction_id}/commit",
            path: {
                transaction_id: transactionId,
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
     * create a new pending transaction revision
     * @returns Transaction Successful Response
     * @throws ApiError
     */
    public createTransactionChange({ transactionId }: { transactionId: number }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/transactions/{transaction_id}/new_change",
            path: {
                transaction_id: transactionId,
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
     * discard currently pending transaction changes
     * @returns Transaction Successful Response
     * @throws ApiError
     */
    public discardTransactionChange({ transactionId }: { transactionId: number }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/transactions/{transaction_id}/discard",
            path: {
                transaction_id: transactionId,
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
     * upload a file as a transaction attachment
     * @returns Transaction Successful Response
     * @throws ApiError
     */
    public uploadFile({
        transactionId,
        formData,
    }: {
        transactionId: number;
        formData: Body_upload_file;
    }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/transactions/{transaction_id}/files",
            path: {
                transaction_id: transactionId,
            },
            formData: formData,
            mediaType: "multipart/form-data",
            errors: {
                401: `unauthorized`,
                403: `forbidden`,
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }

    /**
     * delete a transaction attachment
     * @returns Transaction Successful Response
     * @throws ApiError
     */
    public deleteFile({ fileId }: { fileId: number }): CancelablePromise<Transaction> {
        return this.httpRequest.request({
            method: "DELETE",
            url: "/api/v1/files/{file_id}",
            path: {
                file_id: fileId,
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
     * fetch the (binary) contents of a transaction attachment
     * @returns any Successful Response
     * @throws ApiError
     */
    public getFileContents({ fileId, blobId }: { fileId: number; blobId: number }): CancelablePromise<any> {
        return this.httpRequest.request({
            method: "GET",
            url: "/api/v1/files/{file_id}/{blob_id}",
            path: {
                file_id: fileId,
                blob_id: blobId,
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
