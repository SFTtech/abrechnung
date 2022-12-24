import { AccountType } from "@abrechnung/types";

export const getAccountLink = (groupId: number, type: AccountType, accountId: number): string => {
    return `/groups/${groupId}/${type === "clearing" ? "events" : "accounts"}/${accountId}`;
};
