import { Group, GroupInvite, GroupLogEntry, GroupMember, GroupPreview } from "@abrechnung/types";

export interface BackendGroup {
    id: number;
    name: string;
    description: string;
    terms: string;
    created_at: string;
    created_by: number | null;
    currency_symbol: string;
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
        currency_symbol: group.currency_symbol,
        addUserAccountOnJoin: group.add_user_account_on_join,
    };
};

export interface BackendGroupPreview {
    id: number;
    name: string;
    description: string;
    currency_symbol: string;
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
        currency_symbol: preview.currency_symbol,
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

export interface BackendGroupInvite {
    id: number;
    created_by: number;
    single_use: boolean;
    valid_until: string;
    token: string;
    description: string;
    join_as_editor: boolean;
}

export const backendInviteToInvite = (invite: BackendGroupInvite): GroupInvite => {
    return {
        id: invite.id,
        createdBy: invite.created_by,
        singleUse: invite.single_use,
        validUntil: invite.valid_until,
        description: invite.description,
        token: invite.token,
        joinAsEditor: invite.join_as_editor,
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
