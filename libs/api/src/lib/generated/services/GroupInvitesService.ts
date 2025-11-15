/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* oxlint-disable */
import type { CreateInvitePayload } from "../models/CreateInvitePayload";
import type { GroupInvite } from "../models/GroupInvite";
import type { CancelablePromise } from "../core/CancelablePromise";
import type { BaseHttpRequest } from "../core/BaseHttpRequest";
export class GroupInvitesService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * list all invite links of a group
     * @returns GroupInvite Successful Response
     * @throws ApiError
     */
    public listInvites({ groupId }: { groupId: number }): CancelablePromise<Array<GroupInvite>> {
        return this.httpRequest.request({
            method: "GET",
            url: "/api/v1/groups/{group_id}/invites",
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
     * create a new group invite link
     * @returns GroupInvite Successful Response
     * @throws ApiError
     */
    public createInvite({
        groupId,
        requestBody,
    }: {
        groupId: number;
        requestBody: CreateInvitePayload;
    }): CancelablePromise<GroupInvite> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/groups/{group_id}/invites",
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
     * delete a group invite link
     * @returns void
     * @throws ApiError
     */
    public deleteInvite({ groupId, inviteId }: { groupId: number; inviteId: number }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: "DELETE",
            url: "/api/v1/groups/{group_id}/invites/{invite_id}",
            path: {
                group_id: groupId,
                invite_id: inviteId,
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
