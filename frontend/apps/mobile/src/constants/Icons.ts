import { AccountType, TransactionType } from "@abrechnung/types";

export const clearingAccountIcon = "calculate";
export const personalAccountIcon = "person";

export function getAccountIcon(accountType: AccountType) {
    switch (accountType) {
        case "clearing":
            return clearingAccountIcon;
        case "personal":
            return personalAccountIcon;
    }
}

export const purchaseIcon = "shopping-cart";
export const transferIcon = "compare-arrows";

export function getTransactionIcon(transactionType: TransactionType) {
    switch (transactionType) {
        case "purchase":
            return purchaseIcon;
        case "transfer":
            return transferIcon;
    }
}
