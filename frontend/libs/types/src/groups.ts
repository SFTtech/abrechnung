export interface Group {
    id: number;
    name: string;
    description: string;
    currencySymbol: string;
    terms: string;
    createdAt: string;
    createdBy: number;
    addUserAccountOnJoin: boolean;
}

export interface GroupMember {
    userID: number;
    username: string;
    isOwner: boolean;
    canWrite: boolean;
    description: string;
    joinedAt: string;
    invitedBy: number | null;
}
