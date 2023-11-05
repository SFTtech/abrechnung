import { ClearingAccount as BackendClearingAccount, PersonalAccount as BackendPersonalAccount } from "@abrechnung/api";
import { z } from "zod";

export type ClearingShares = Record<string, number>;

export type BackendAccount = BackendClearingAccount | BackendPersonalAccount;

export type ClearingAccount = BackendClearingAccount & { is_wip: boolean };
export type PersonalAccount = BackendPersonalAccount & { is_wip: boolean };

export type Account = BackendAccount & { is_wip: boolean };

const BaseAccountValidator = z.object({
    name: z.string({ required_error: "Name is required" }),
    description: z.string().optional(),
});

export const PersonalAccountValidator = z
    .object({
        owning_user_id: z.number().nullable(),
    })
    .merge(BaseAccountValidator)
    .passthrough();

export const ClearingAccountValidator = z
    .object({
        date_info: z.string(),
        clearing_shares: z.record(z.number()).refine((shares) => Object.keys(shares).length > 0, "select at least one"),
        tags: z.array(z.string()),
    })
    .merge(BaseAccountValidator)
    .passthrough();

export const AccountValidator = z.discriminatedUnion("type", [
    ClearingAccountValidator.merge(z.object({ type: z.literal("clearing") })),
    PersonalAccountValidator.merge(z.object({ type: z.literal("personal") })),
]);

export interface AccountBalance {
    balance: number;
    beforeClearing: number;
    totalConsumed: number;
    totalPaid: number;
    clearingResolution: { [k: number]: number };
}

export type AccountBalanceMap = { [k: number]: AccountBalance };
