import {
    FileAttachment as BackendFileAttachment,
    Transaction as BackendTransaction,
    TransactionPosition as BackendTransactionPosition,
    NewFile,
    UpdateFile,
} from "@abrechnung/api";
import { z } from "zod";

export type TransactionShare = { [k: number]: number };

export type TransactionType = "purchase" | "transfer";

const BaseTransactionValidator = z.object({
    name: z.string({ required_error: "Name is required" }).min(1, "Name is required"),
    value: z.number({ required_error: "Value is required" }),
    billed_at: z
        .string({ required_error: "Billed at is required" })
        .regex(/\d{4}-\d{2}-\d{2}/, "A valid date is required"),
    description: z.string().optional(),
    currency_symbol: z.string({ required_error: "Currency is required" }).min(1, "Currency is required"),
    currency_conversion_rate: z
        .number({ required_error: "Currency conversion rate is required" })
        .positive("Currency conversion rate must be larger than 0"),
});

export const PurchaseValidator = z
    .object({
        creditor_shares: z
            .record(z.number())
            .refine((shares) => Object.keys(shares).length > 0, "somebody has payed for this"),
        debitor_shares: z.record(z.number()).refine((shares) => Object.keys(shares).length > 0, "select at least one"),
    })
    .merge(BaseTransactionValidator)
    .passthrough();

export const TransferValidator = z
    .object({
        creditor_shares: z
            .record(z.number())
            .refine((shares) => Object.keys(shares).length > 0, "somebody has payed for this"),
        debitor_shares: z
            .record(z.number())
            .refine((shares) => Object.keys(shares).length > 0, "who received this money?"),
    })
    .merge(BaseTransactionValidator)
    .passthrough();

export const TransactionValidator = z.discriminatedUnion("type", [
    PurchaseValidator.merge(z.object({ type: z.literal("purchase") })),
    TransferValidator.merge(z.object({ type: z.literal("transfer") })),
]);

export const PositionValidator = z
    .object({
        name: z.string({ required_error: "name is required" }).min(1, "name is required"),
        price: z.number({ required_error: "price is required" }),
        communist_shares: z.number({ required_error: "price is required" }),
        usages: z.record(z.number()),
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

export type FileAttachment =
    | (BackendFileAttachment & { type: "backend" })
    | ({ type: "updated" } & UpdateFile)
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
