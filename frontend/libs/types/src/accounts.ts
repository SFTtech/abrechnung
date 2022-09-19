import { ErrorStruct } from "./general";

export type ClearingShares = { [k: number]: number };

export type AccountType = "personal" | "clearing";

export interface Account {
    id: number;
    type: AccountType;
    group_id: number;
    name: string;
    description: string;
    priority: number;
    owning_user_id: number | null;
    clearing_shares: ClearingShares;
    deleted: boolean;

    revision_started_at: Date | null;
    revision_committed_at: Date | null;
    version: number;

    last_changed: Date;

    is_wip: boolean;
    has_local_changes: boolean;
}

export function validateAccount(a: Account): ErrorStruct | null {
    const errors: ErrorStruct = {};
    let hasErrors = false;

    if (a.name === "") {
        errors["name"] = "name cannot be empty";
        hasErrors = true;
    }

    return hasErrors ? errors : null;
}
