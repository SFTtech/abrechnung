export type ClearingShares = { [k: number]: number };

export type AccountType = "personal" | "clearing";

export interface Account {
    id: number;
    type: AccountType;
    groupID: number;
    name: string;
    description: string;
    priority: number;
    owningUserID: number | null;
    clearingShares: ClearingShares | null;
    deleted: boolean;

    revisionStartedAt: Date | null;
    revisionCommittedAt: Date | null;
    version: number;

    lastChanged: Date;

    isWip: boolean;
    hasLocalChanges: boolean;
}

export interface AccountValidationErrors {
    name?: string;
    description?: string;
    clearingShares?: string;
}

export const validateAccount = (a: Account): AccountValidationErrors => {
    const errors: AccountValidationErrors = {};

    if (a.name === "") {
        errors.name = "name cannot be empty";
    }

    return errors;
};

export interface AccountBalance {
    balance: number;
    beforeClearing: number;
    totalConsumed: number;
    totalPaid: number;
    clearingResolution: Map<number, number>;
}

export type AccountBalanceMap = Map<number, AccountBalance>;
