import { z } from "zod";

export type TransactionShare = { [k: number]: number };

export type TransactionType = "purchase" | "transfer";

const BaseTransactionValidator = z.object({
    name: z.string({ required_error: "Name is required" }).min(1, "Name is required"),
    value: z.number({ required_error: "Value is required" }),
    billedAt: z
        .string({ required_error: "Billed at is required" })
        .regex(/\d{4}-\d{2}-\d{2}/, "A valid date is required"),
    description: z.string().optional(),
    currencySymbol: z.string({ required_error: "Currency is required" }).min(1, "Currency is required"),
    currencyConversionRate: z
        .number({ required_error: "Currency conversion rate is required" })
        .positive("Currency conversion rate must be larger than 0"),
});

export const PurchaseValidator = z
    .object({
        creditorShares: z
            .record(z.number())
            .refine((shares) => Object.keys(shares).length > 0, "somebody has payed for this"),
        debitorShares: z.record(z.number()).refine((shares) => Object.keys(shares).length > 0, "select at least one"),
    })
    .merge(BaseTransactionValidator)
    .passthrough();

export const TransferValidator = z
    .object({
        creditorShares: z
            .record(z.number())
            .refine((shares) => Object.keys(shares).length > 0, "somebody has payed for this"),
        debitorShares: z
            .record(z.number())
            .refine((shares) => Object.keys(shares).length > 0, "who received this money?"),
    })
    .merge(BaseTransactionValidator)
    .passthrough();

export const TransactionValidator = z.discriminatedUnion("type", [
    PurchaseValidator.merge(z.object({ type: z.literal("purchase") })),
    TransferValidator.merge(z.object({ type: z.literal("transfer") })),
]);

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

interface CommonTransactionMetadata {
    // static fields which never change through the lifetime of a transaction
    id: number;
    groupID: number;
    type: TransactionType;

    // fields that can change and are part of a transaction
    name: string;
    description: string;
    value: number;
    currencySymbol: string;
    currencyConversionRate: number;
    billedAt: string;
    tags: string[];
    creditorShares: TransactionShare;
    debitorShares: TransactionShare;
    deleted: boolean;

    attachments: number[];
}

export interface PurchaseBase extends CommonTransactionMetadata {
    type: "purchase";
    positions: number[];
}

export interface TransferBase extends CommonTransactionMetadata {
    type: "transfer";
}

export type TransactionBase = PurchaseBase | TransferBase;

interface TransactionMetadata {
    // fields that can change and are computed
    hasLocalChanges: boolean;
    lastChanged: string;
    isWip: boolean;
}

export type Purchase = PurchaseBase & TransactionMetadata;
export type Transfer = TransferBase & TransactionMetadata;

export type Transaction = Purchase | Transfer;

/**
 * mainly used easier internal parameter passing,
 * e.g. when returning data from the http api wrappers
 */
export interface TransactionContainer {
    transaction: Transaction;
    positions: TransactionPosition[];
    attachments: TransactionAttachment[];
}
