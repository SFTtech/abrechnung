/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateInvitePayload } from '../models/CreateInvitePayload';
import type { Group } from '../models/Group';
import type { GroupInvite } from '../models/GroupInvite';
import type { GroupLog } from '../models/GroupLog';
import type { GroupMember } from '../models/GroupMember';
import type { GroupMessage } from '../models/GroupMessage';
import type { GroupPayload } from '../models/GroupPayload';
import type { GroupPreview } from '../models/GroupPreview';
import type { PreviewGroupPayload } from '../models/PreviewGroupPayload';
import type { UpdateGroupMemberPayload } from '../models/UpdateGroupMemberPayload';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class GroupsService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * preview a group before joining using an invite token
     * @returns GroupPreview Successful Response
     * @throws ApiError
     */
    public previewGroup({
        requestBody,
    }: {
        requestBody: PreviewGroupPayload,
    }): CancelablePromise<GroupPreview> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/groups/preview',
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
     * join a group using an invite token
     * @returns Group Successful Response
     * @throws ApiError
     */
    public joinGroup({
        requestBody,
    }: {
        requestBody: PreviewGroupPayload,
    }): CancelablePromise<Group> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/groups/join',
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
     * list the current users groups
     * @returns Group Successful Response
     * @throws ApiError
     */
    public listGroups(): CancelablePromise<Array<Group>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/groups',
            errors: {
                401: `unauthorized`,
                403: `forbidden`,
                404: `Not found`,
            },
        });
    }

    /**
     * create a group
     * @returns Group Successful Response
     * @throws ApiError
     */
    public createGroup({
        requestBody,
    }: {
        requestBody: GroupPayload,
    }): CancelablePromise<Group> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/groups',
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
     * fetch group details
     * @returns Group Successful Response
     * @throws ApiError
     */
    public getGroup({
        groupId,
    }: {
        groupId: number,
    }): CancelablePromise<Group> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/groups/{group_id}',
            path: {
                'group_id': groupId,
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
     * update group details
     * @returns Group Successful Response
     * @throws ApiError
     */
    public updateGroup({
        groupId,
        requestBody,
    }: {
        groupId: number,
        requestBody: GroupPayload,
    }): CancelablePromise<Group> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/groups/{group_id}',
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
     * delete a group
     * @returns void
     * @throws ApiError
     */
    public deleteGroup({
        groupId,
    }: {
        groupId: number,
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/api/v1/groups/{group_id}',
            path: {
                'group_id': groupId,
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
     * leave a group
     * @returns void
     * @throws ApiError
     */
    public leaveGroup({
        groupId,
    }: {
        groupId: number,
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/groups/{group_id}/leave',
            path: {
                'group_id': groupId,
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
     * list all members of a group
     * @returns GroupMember Successful Response
     * @throws ApiError
     */
    public listMembers({
        groupId,
    }: {
        groupId: number,
    }): CancelablePromise<Array<GroupMember>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/groups/{group_id}/members',
            path: {
                'group_id': groupId,
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
        groupId: number,
        requestBody: UpdateGroupMemberPayload,
    }): CancelablePromise<GroupMember> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/groups/{group_id}/members',
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
     * fetch the group log
     * @returns GroupLog Successful Response
     * @throws ApiError
     */
    public listLog({
        groupId,
    }: {
        groupId: number,
    }): CancelablePromise<Array<GroupLog>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/groups/{group_id}/logs',
            path: {
                'group_id': groupId,
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
        groupId: number,
        requestBody: GroupMessage,
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/groups/{group_id}/send_message',
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
     * list all invite links of a group
     * @returns GroupInvite Successful Response
     * @throws ApiError
     */
    public listInvites({
        groupId,
    }: {
        groupId: number,
    }): CancelablePromise<Array<GroupInvite>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/groups/{group_id}/invites',
            path: {
                'group_id': groupId,
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
        groupId: number,
        requestBody: CreateInvitePayload,
    }): CancelablePromise<GroupInvite> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/groups/{group_id}/invites',
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
     * delete a group invite link
     * @returns void
     * @throws ApiError
     */
    public deleteInvite({
        groupId,
        inviteId,
    }: {
        groupId: number,
        inviteId: number,
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/api/v1/groups/{group_id}/invites/{invite_id}',
            path: {
                'group_id': groupId,
                'invite_id': inviteId,
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
