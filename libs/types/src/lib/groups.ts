import { z } from "zod";

export interface GroupBase {
    id: number;
    name: string;
    description: string;
    currency_identifier: string;
    terms: string;
    addUserAccountOnJoin: boolean;
}

export const GroupValidator = z.object({
    name: z.string({ error: (issue) => (issue.input === undefined ? "Name is required" : "Not a string") }),
    description: z.string().optional(),
    terms: z.string().optional(),
    currency_identifier: z.string({
        error: (issue) => (issue.input === undefined ? "Currency is required" : "Not a string"),
    }),
    addUserAccountOnJoin: z.boolean(),
});

export interface Group extends GroupBase {
    // non-mutable properties
    createdAt: string;
    createdBy: number | null;
}

export interface GroupPreview {
    id: number;
    name: string;
    description: string;
    currency_identifier: string;
    terms: string;
    createdAt: string;
    createdBy: number | null;
    inviteDescription: string;
    inviteValidUntil: string;
    inviteSingleUse: boolean;
}

export interface GroupPermissions {
    isOwner: boolean;
    canWrite: boolean;
}

export interface GroupMember extends GroupPermissions {
    userID: number;
    username: string;
    description: string;
    joinedAt: string;
    invitedBy: number | null;
}

export interface GroupInvite {
    id: number;
    createdBy: number;
    singleUse: boolean;
    validUntil: string;
    token: string;
    description: string;
    joinAsEditor: boolean;
}

export interface GroupLogEntry {
    id: number;
    type: string;
    message: string;
    loggedAt: string;
    userID: number;
    affectedUserID: number | null;
}
