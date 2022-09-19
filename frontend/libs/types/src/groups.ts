export interface Group {
    id: number;
    name: string;
    description: string;
    currency_symbol: string;
    terms: string;
    created_at: string;
    created_by: number;
    add_user_account_on_join: boolean;
}

export interface GroupMember {
    user_id: number;
    username: string;
    is_owner: boolean;
    can_write: boolean;
    description: string;
    joined_at: string;
    invited_by: number | null;
}
