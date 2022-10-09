export type TransactionShare = { [k: number]: number };

export type TransactionType = "purchase" | "transfer" | "mimo";

export interface Transaction {
    id: number;
    groupID: number;
    type: TransactionType;

    description: string;
    value: number;
    currencySymbol: string;
    currencyConversionRate: number;
    billedAt: Date;
    creditorShares: TransactionShare;
    debitorShares: TransactionShare;
    deleted: boolean;

    revisionStartedAt: Date | null;
    revisionCommittedAt: Date | null;
    version: number;

    lastChanged: Date;

    isWip: boolean;
    hasLocalChanges: boolean;
}

export interface TransactionValidationErrors {
    description?: string;
    billedAt?: string;
    value?: string;
    creditorShares?: string;
    debitorShares?: string;
}

export function validateTransaction(t: Transaction): TransactionValidationErrors {
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
}

// TODO: implement attachments
export interface TransactionAttachment {
    id: number;
    filename: string;
    blobID: number;
    deleted: boolean;
    url: string;
}

export interface TransactionPosition {
    id: number;
    transactionID: number;
    groupID: number;
    price: number;
    communistShares: number;
    deleted: boolean;
    name: string;
    usages: TransactionShare;

    hasLocalChanges: boolean;
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
