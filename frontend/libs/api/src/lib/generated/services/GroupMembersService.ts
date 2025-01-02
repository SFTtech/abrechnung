/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GroupMember } from "../models/GroupMember";
import type { UpdateGroupMemberPayload } from "../models/UpdateGroupMemberPayload";
import type { CancelablePromise } from "../core/CancelablePromise";
import type { BaseHttpRequest } from "../core/BaseHttpRequest";
export class GroupMembersService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * list all members of a group
     * @returns GroupMember Successful Response
     * @throws ApiError
     */
    public listMembers({ groupId }: { groupId: number }): CancelablePromise<Array<GroupMember>> {
        return this.httpRequest.request({
            method: "GET",
            url: "/api/v1/groups/{group_id}/members",
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
     * update the permissions of a group member
     * @returns GroupMember Successful Response
     * @throws ApiError
     */
    public updateMemberPermissions({
        groupId,
        requestBody,
    }: {
        groupId: number;
        requestBody: UpdateGroupMemberPayload;
    }): CancelablePromise<GroupMember> {
        return this.httpRequest.request({
            method: "POST",
            url: "/api/v1/groups/{group_id}/members",
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
