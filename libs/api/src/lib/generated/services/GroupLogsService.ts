/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* oxlint-disable */
import type { GroupLog } from "../models/GroupLog";
import type { GroupMessage } from "../models/GroupMessage";
import type { CancelablePromise } from "../core/CancelablePromise";
import type { BaseHttpRequest } from "../core/BaseHttpRequest";
export class GroupLogsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * fetch the group log
     * @returns GroupLog Successful Response
     * @throws ApiError
     */
    public listLog({ groupId }: { groupId: number }): CancelablePromise<Array<GroupLog>> {
        return this.httpRequest.request({
            method: "GET",
            url: "/api/v1/groups/{group_id}/logs",
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
     * post a message to the group log
     * @returns void
     * @throws ApiError
     */
    public sendGroupMessage({
        groupId,
        requestBody,
    }: {
        groupId: number;
        requestBody: GroupMessage;
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/groups/{group_id}/send_message",
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
}
