import { z } from "zod";

export type ClearingShares = { [k: number]: number };

export type AccountType = "personal" | "clearing";

interface CommonAccountMetadata {
    // static fields which never change through the lifetime of an account
    id: number;
    groupID: number;
    type: AccountType;

    // fields that can change and are part of an account
    name: string;
    description: string;
    deleted: boolean;
}

interface AccountMetadata {
    // fields that can change and are computed
    hasLocalChanges: boolean;
    lastChanged: string; // ISO encoded
    isWip: boolean;

    // soon to be deprecated fields
    hasCommittedChanges?: boolean;
}

export interface PersonalAccountBase extends CommonAccountMetadata {
    type: "personal";
    owningUserID: number | null;
}

export type PersonalAccount = PersonalAccountBase & AccountMetadata;

export interface ClearingAccountBase extends CommonAccountMetadata {
    type: "clearing";
    clearingShares: ClearingShares;
    dateInfo: string;
    tags: string[];
}
export type ClearingAccount = ClearingAccountBase & AccountMetadata;

export type AccountBase = PersonalAccountBase | ClearingAccountBase;
export type Account = ClearingAccount | PersonalAccount;

const BaseAccountValidator = z.object({
    name: z.string({ required_error: "Name is required" }),
    description: z.string().optional(),
});

export const PersonalAccountValidator = z
    .object({
        owningUserID: z.number().nullable(),
    })
    .merge(BaseAccountValidator)
    .passthrough();

export const ClearingAccountValidator = z
    .object({
        dateInfo: z.string(),
        clearingShares: z.record(z.number()).refine((shares) => Object.keys(shares).length > 0, "select at least one"),
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
