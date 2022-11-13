export type ClearingShares = { [k: number]: number };

export type AccountType = "personal" | "clearing";

export interface AccountBase {
    // static fields which never change through the lifetime of an account
    id: number;
    groupID: number;
    type: AccountType;

    // fields that can change and are part of an account
    name: string;
    description: string;
    owningUserID: number | null;
    clearingShares: ClearingShares | null;
    deleted: boolean;
}

export interface Account extends AccountBase {
    // fields that can change and are computed
    hasLocalChanges: boolean;
    lastChanged: string; // ISO encoded
    isWip: boolean;

    // soon to be deprecated fields
    hasCommittedChanges?: boolean;
}

export interface AccountValidationErrors {
    name?: string;
    description?: string;
    clearingShares?: string;
}

export const validateAccount = <T extends AccountBase>(a: T): AccountValidationErrors => {
    const errors: AccountValidationErrors = {};

    if (a.name === "") {
        errors.name = "name cannot be empty";
    }

    if (a.type == "personal" && a.clearingShares != null && Object.keys(a.clearingShares).length === null) {
        errors.clearingShares = "a 'personal' account cannot have clearing shares";
    }

    return errors;
};

export interface AccountBalance {
    balance: number;
    beforeClearing: number;
    totalConsumed: number;
    totalPaid: number;
    clearingResolution: { [k: number]: number }; // TODO: make plain old object
}

export type AccountBalanceMap = { [k: number]: AccountBalance };
