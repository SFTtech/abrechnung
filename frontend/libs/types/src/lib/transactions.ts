export type TransactionShare = { [k: number]: number };

export type TransactionType = "purchase" | "transfer" | "mimo";

export interface TransactionValidationErrors {
    description?: string;
    billedAt?: string;
    value?: string;
    creditorShares?: string;
    debitorShares?: string;
}

export const validateTransactionDetails = <T extends TransactionBase>(t: T): TransactionValidationErrors => {
    const errors: TransactionValidationErrors = {};

    const emptyChecks = ["description", "billedAt", "currencySymbol", "currencyConversionRate"];
    for (const check of emptyChecks) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (t[check] === "") {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            errors[check] = `${check} cannot be empty`;
        }
    }

    if (Object.keys(t.creditorShares).length === 0) {
        errors.creditorShares = "somebody needs to pay for this";
    }
    if (Object.keys(t.debitorShares).length === 0) {
        errors.debitorShares = "select at least one";
    }

    return errors;
};

export interface TransactionAttachment {
    id: number;
    transactionID: number;
    filename: string;
    blobID: number;
    url: string;
    deleted: boolean;
}

export interface TransactionPosition {
    id: number;
    transactionID: number;
    name: string;
    price: number;
    communistShares: number;
    usages: TransactionShare;
    deleted: boolean;
}

export interface PositionValidationErrors {
    name?: string;
    price?: string;
    usages?: string;
}

export function validatePosition(p: TransactionPosition): PositionValidationErrors {
    const errors: PositionValidationErrors = {};

    if (p.name === "") {
        errors.name = "name cannot be empty";
    }
    if (Object.keys(p.usages).length === 0) {
        errors.usages = "select at least one";
    }

    return errors;
}

export interface TransactionAccountBalance {
    total: number;
    positions: number;
    commonCreditors: number;
    commonDebitors: number;
}

export type TransactionBalanceEffect = { [k: number]: TransactionAccountBalance };

export interface TransactionBase {
    // static fields which never change through the lifetime of a transaction
    id: number;
    groupID: number;
    type: TransactionType;

    // fields that can change and are part of a transaction
    description: string;
    value: number;
    currencySymbol: string;
    currencyConversionRate: number;
    billedAt: string;
    creditorShares: TransactionShare;
    debitorShares: TransactionShare;
    deleted: boolean;

    positions: number[];
    attachments: number[];
}

export interface Transaction extends TransactionBase {
    // fields that can change and are computed
    hasLocalChanges: boolean;
    lastChanged: string;
    isWip: boolean;

    // soon to be deprecated fields
    hasCommittedChanges?: boolean;
}

/**
 * mainly used easier internal parameter passing,
 * e.g. when returning data from the http api wrappers
 */
export interface TransactionContainer {
    transaction: Transaction;
    positions: TransactionPosition[];
    attachments: TransactionAttachment[];
}
