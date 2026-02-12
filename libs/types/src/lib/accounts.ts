import { ClearingAccount as BackendClearingAccount, PersonalAccount as BackendPersonalAccount } from "@abrechnung/api";
import { z } from "zod";

export type ClearingShares = Record<string, number>;

export type BackendAccount = BackendClearingAccount | BackendPersonalAccount;

export type ClearingAccount = BackendClearingAccount & { is_wip: boolean };
export type PersonalAccount = BackendPersonalAccount & { is_wip: boolean };

export type Account = BackendAccount & { is_wip: boolean };

const BaseAccountValidator = z.object({
    name: z.string({ error: (issue) => (issue.input === undefined ? "Name is required" : null) }),
    description: z.string().optional(),
});

export const PersonalAccountValidator = z.looseObject({
    ...BaseAccountValidator.shape,
});

export const ClearingAccountValidator = z.looseObject({
    date_info: z.string(),
    clearing_shares: z
        .record(z.string(), z.number())
        .refine((shares) => Object.keys(shares).length > 0, "select at least one"),
    tags: z.array(z.string()),
    ...BaseAccountValidator.shape,
});

export const AccountValidator = z.discriminatedUnion("type", [
    z.looseObject({ type: z.literal("clearing"), ...ClearingAccountValidator.shape }),
    z.looseObject({ type: z.literal("personal"), ...PersonalAccountValidator.shape }),
]);

export interface AccountBalance {
    balance: number;
    beforeClearing: number;
    totalConsumedPurchases: number;
    totalPaidPurchases: number;
    totalReceivedTransfers: number;
    totalPaidTransfers: number;
    clearingResolution: { [k: number]: number };
}

export type AccountBalanceMap = { [k: number]: AccountBalance };
