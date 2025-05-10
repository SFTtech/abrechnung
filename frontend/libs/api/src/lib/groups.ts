import { Group, GroupLogEntry, GroupMember, GroupPreview } from "@abrechnung/types";

export interface BackendGroup {
    id: number;
    name: string;
    description: string;
    terms: string;
    created_at: string;
    created_by: number | null;
    currency_identifier: string;
    add_user_account_on_join: boolean;
}

export const backendGroupToGroup = (group: BackendGroup): Group => {
    return {
        id: group.id,
        name: group.name,
        description: group.description,
        terms: group.terms,
        createdAt: group.created_at,
        createdBy: group.created_by,
        currency_identifier: group.currency_identifier,
        addUserAccountOnJoin: group.add_user_account_on_join,
    };
};

export interface BackendGroupPreview {
    id: number;
    name: string;
    description: string;
    currency_identifier: string;
    terms: string;
    created_at: string;
    created_by: number | null;
    invite_description: string;
    invite_valid_until: string;
    invite_single_use: boolean;
}

export const backendGroupPreviewToPreview = (preview: BackendGroupPreview): GroupPreview => {
    return {
        id: preview.id,
        name: preview.name,
        description: preview.description,
        currency_identifier: preview.currency_identifier,
        terms: preview.terms,
        createdAt: preview.created_at,
        createdBy: preview.created_by,
        inviteDescription: preview.invite_description,
        inviteValidUntil: preview.invite_valid_until,
        inviteSingleUse: preview.invite_single_use,
    };
};

export interface BackendGroupMember {
    user_id: number;
    username: string;
    is_owner: boolean;
    can_write: boolean;
    description: string;
    joined_at: string;
    invited_by: number | null;
}

export const backendMemberToMember = (member: BackendGroupMember): GroupMember => {
    return {
        userID: member.user_id,
        username: member.username,
        isOwner: member.is_owner,
        canWrite: member.can_write,
        description: member.description,
        joinedAt: member.joined_at,
        invitedBy: member.invited_by,
    };
};

export interface BackendGroupLogEntry {
    id: number;
    type: string;
    message: string;
    user_id: number;
    logged_at: string;
    affected_user_id: number | null;
}

export const backendLogEntryToLogEntry = (log: BackendGroupLogEntry): GroupLogEntry => {
    return {
        id: log.id,
        type: log.type,
        message: log.message,
        loggedAt: log.logged_at,
        userID: log.user_id,
        affectedUserID: log.affected_user_id,
    };
};
