import * as React from "react";
import { AccountType, TransactionType } from "@abrechnung/types";
import { Event, CompareArrows, Person, ShoppingCart } from "@mui/icons-material";

export const ClearingAccountIcon = Event;
export const PersonalAccountIcon = Person;
export const TransferIcon = CompareArrows;
export const PurchaseIcon = ShoppingCart;

export const getAccountIcon = (type: AccountType): React.ReactNode => {
    switch (type) {
        case "clearing":
            return <ClearingAccountIcon />;
        case "personal":
            return <PersonalAccountIcon />;
    }
};
export const getTransactionIcon = (type: TransactionType): React.ReactNode => {
    switch (type) {
        case "transfer":
            return <TransferIcon />;
        case "purchase":
            return <PurchaseIcon />;
    }
};
