import {
    FileAttachment as BackendFileAttachment,
    Transaction as BackendTransaction,
    TransactionPosition as BackendTransactionPosition,
    NewFile,
    SplitMode,
    UpdateFile,
} from "@abrechnung/api";
import { CurrencyIdentifierSchema } from "@abrechnung/core";
import { z } from "zod";

export type TransactionShare = { [k: number]: number };

export type TransactionType = "purchase" | "transfer";

export type FrontendSplitMode = "evenly" | SplitMode;

const BaseTransactionValidator = z.object({
    name: z
        .string({ error: (issue) => (issue.input === undefined ? "Name is required" : null) })
        .min(1, "Name is required"),
    value: z.number({ error: (issue) => (issue.input === undefined ? "Value is required" : null) }),
    billed_at: z
        .string({ error: (issue) => (issue.input === undefined ? "Billed at is required" : null) })
        .regex(/\d{4}-\d{2}-\d{2}/, "A valid date is required"),
    description: z.string().optional(),
    currency_identifier: CurrencyIdentifierSchema,
    tags: z.array(z.string()),
    currency_conversion_rate: z
        .number({ error: (issue) => (issue.input === undefined ? "Currency conversion rate is required" : null) })
        .positive("Currency conversion rate must be larger than 0"),
    split_mode: z.enum(["shares", "absolute", "percent"]),
});

export const PurchaseValidator = z.looseObject({
    creditor_shares: z
        .record(z.string(), z.number())
        .refine((shares) => Object.keys(shares).length === 1, "somebody has payed for this"),
    debitor_shares: z
        .record(z.string(), z.number())
        .refine((shares) => Object.keys(shares).length > 0, "select at least one"),
    ...BaseTransactionValidator.shape,
});

export const MimoValidator = z.looseObject({
    creditor_shares: z
        .record(z.string(), z.number())
        .refine((shares) => Object.keys(shares).length > 0, "somebody has payed for this"),
    debitor_shares: z
        .record(z.string(), z.number())
        .refine((shares) => Object.keys(shares).length > 0, "select at least one"),
    ...BaseTransactionValidator.shape,
});

export const TransferValidator = z.looseObject({
    creditor_shares: z
        .record(z.string(), z.number())
        .refine((shares) => Object.keys(shares).length > 0, "somebody has payed for this"),
    debitor_shares: z
        .record(z.string(), z.number())
        .refine((shares) => Object.keys(shares).length > 0, "who received this money?"),
    ...BaseTransactionValidator.shape,
});

export const TransactionValidator = z
    .discriminatedUnion("type", [
        z.looseObject({ type: z.literal("purchase"), ...PurchaseValidator.shape }),
        z.looseObject({ type: z.literal("transfer"), ...TransferValidator.shape }),
        z.object({ type: z.literal("mimo"), ...MimoValidator.shape }),
    ])
    .refine(
        (data) => {
            const splitMode = data.split_mode;
            if (splitMode !== "percent") {
                return true;
            }
            const totalPercent = Object.values(data.debitor_shares).reduce((acc, curr) => acc + curr, 0);
            return Math.abs(totalPercent - 1) <= 0.00001;
        },
        { path: ["debitor_shares"], message: "shares must sum up to 100% in percentage split mode" }
    )
    .refine(
        (data) => {
            const splitMode = data.split_mode;
            if (splitMode !== "absolute") {
                return true;
            }
            const totalPercent = Object.values(data.debitor_shares).reduce((acc, curr) => acc + curr, 0);
            return Math.abs(totalPercent - data.value) <= 0.00001;
        },
        { path: ["debitor_shares"], message: "shares must sum up to the transaction value in amount split mode" }
    );

export const PositionValidator = z
    .object({
        name: z
            .string({ error: (issue) => (issue.input === undefined ? "Name is required" : null) })
            .min(1, "Name is required"),
        price: z.number({ error: (issue) => (issue.input === undefined ? "Price is required" : null) }),
        communist_shares: z.number({ error: (issue) => (issue.input === undefined ? "Shares is required" : null) }),
        usages: z.record(z.string(), z.number()),
    })
    .refine(
        (position) => {
            if (Object.keys(position.usages).length === 0 && position.communist_shares === 0) {
                return false;
            }
            return true;
        },
        { message: "a position must either be shared or assigned to an account" }
    );

export type PositionValidationErrors = z.core.$ZodFlattenedError<z.infer<typeof PositionValidator>>;

export interface TransactionAccountBalance {
    total: number;
    positions: number;
    commonCreditors: number;
    commonDebitors: number;
}

export type TransactionBalanceEffect = { [k: number]: TransactionAccountBalance };

export type TransactionPosition = BackendTransactionPosition & {
    is_changed: boolean;
    only_local: boolean;
};

export type UpdatedFileAttachment = { blob_id: number | null; mime_type: string | null } & UpdateFile;

export type FileAttachment =
    | (BackendFileAttachment & { type: "backend" })
    | ({ type: "updated" } & UpdatedFileAttachment)
    | ({ type: "new"; id: number } & NewFile);

export type Transaction = Omit<BackendTransaction, "positions" | "files" | "is_wip"> & {
    is_wip: boolean;
    positions: {
        [k: number]: TransactionPosition;
    };
    position_ids: number[];
    files: {
        [k: number]: FileAttachment;
    };
    file_ids: number[];
};
