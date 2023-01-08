import { AccountType } from "@abrechnung/types";

export const getAccountListLink = (groupId: number, type: AccountType): string => {
    return `/groups/${groupId}/${type === "clearing" ? "events" : "accounts"}`;
};

export const getAccountLink = (groupId: number, type: AccountType, accountId: number): string => {
    return `/groups/${groupId}/${type === "clearing" ? "events" : "accounts"}/${accountId}`;
};
