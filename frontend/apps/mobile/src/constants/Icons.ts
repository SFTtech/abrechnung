import { AccountType, TransactionType } from "@abrechnung/types";

export const clearingAccountIcon = "calculate";
export const personalAccountIcon = "person";

export const getAccountIcon = (accountType: AccountType) => {
    switch (accountType) {
        case "clearing":
            return clearingAccountIcon;
        case "personal":
            return personalAccountIcon;
    }

    return personalAccountIcon;
};

export const purchaseIcon = "shopping-cart";
export const transferIcon = "compare-arrows";

export const getTransactionIcon = (transactionType: TransactionType) => {
    switch (transactionType) {
        case "purchase":
            return purchaseIcon;
        case "transfer":
            return transferIcon;
    }

    return purchaseIcon;
};
