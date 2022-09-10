export class ValidationError extends Error {
    data: object;

    constructor(data) {
        super("validation error");
        this.data = data;
    }
}

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

type ErrorStruct = {
    [k: string]: string
}

export function validateAccount(a: Account): ErrorStruct | null {
    let errors = {};
    let hasErrors = false;

    if (a.name === "") {
        errors["name"] = "name cannot be empty";
        hasErrors = true;
    }

    return hasErrors ? errors : null;
}

export type TransactionShare = { [k: number]: number };

export type TransactionType = "purchase" | "transfer" | "mimo";

export interface Transaction {
    id: number;
    group_id: number;
    type: TransactionType;

    description: string;
    value: number;
    currency_symbol: string;
    currency_conversion_rate: number;
    billed_at: Date;
    creditor_shares: TransactionShare;
    debitor_shares: TransactionShare;
    deleted: boolean;

    revision_started_at: Date | null;
    revision_committed_at: Date | null;
    version: number;

    last_changed: Date;

    is_wip: boolean;
    has_local_changes: boolean;
}

export function validateTransaction(t: Transaction): ErrorStruct | null {
    let errors = {};
    let hasErrors = false;

    const emptyChecks = ["description", "billed_at", "currency_symbol", "currency_conversion_rate"];
    for (const check of emptyChecks) {
        if (t[check] === "") {
            errors[check] = `${check} cannot be empty`;
            hasErrors = true;
        }
    }

    if (Object.keys(t.creditor_shares).length === 0) {
        errors["creditor_shares"] = "somebody needs to pay for this";
    }
    if (Object.keys(t.debitor_shares).length === 0) {
        errors["debitor_shares"] = "select at least one";
    }

    return hasErrors ? errors : null;
}

// TODO: implement attachments
export interface TransactionAttachment {
    id: number;
    filename: string;
    blob_id: number;
    deleted: boolean;
    url: string;
}

export interface TransactionPosition {
    id: number;
    transaction_id: number;
    group_id: number,
    price: number;
    communist_shares: number;
    deleted: boolean;
    name: string;
    usages: TransactionShare;

    has_local_changes: boolean;
}


export function validatePosition(p: TransactionPosition): ErrorStruct | null {
    let errors = {};
    let hasErrors = false;

    if (p.name === "") {
        errors["name"] = "name cannot be empty";
        hasErrors = true;
    }
    if (Object.keys(p.usages).length === 0) {
        errors["usages"] = "select at least one";
    }

    return hasErrors ? errors : null;
}
