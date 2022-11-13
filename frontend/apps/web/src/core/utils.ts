import { useLocation } from "react-router-dom";
import { DateTime } from "luxon";
import { useEffect } from "react";
import { Theme } from "@mui/material";
import { Transaction, TransactionBalanceEffect } from "@abrechnung/types";

export const useQuery = (): URLSearchParams => {
    return new URLSearchParams(useLocation().search);
};

export const balanceColor = (value: number, theme: Theme): string => {
    if (value >= 0) {
        return theme.palette.mode === "light" ? theme.palette.success.dark : theme.palette.success.light;
    } else {
        return theme.palette.mode === "light" ? theme.palette.error.dark : theme.palette.error.light;
    }
};

export const useTitle = (title: string) => {
    useEffect(() => {
        const prevTitle = document.title;
        document.title = title;
        return () => {
            document.title = prevTitle;
        };
    });
};

export const filterTransaction = (
    transaction: Transaction,
    transactionBalanceEffect: TransactionBalanceEffect,
    searchTerm: string,
    accountIDToName: { [k: number]: string }
): boolean => {
    if (
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        DateTime.fromISO(transaction.billedAt)
            .toLocaleString(DateTime.DATE_FULL)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
        DateTime.fromISO(transaction.lastChanged)
            .toLocaleString(DateTime.DATE_FULL)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
        String(transaction.value).includes(searchTerm.toLowerCase())
    ) {
        return true;
    }

    return Object.keys(transactionBalanceEffect).reduce((acc: boolean, curr: string): boolean => {
        return acc || accountIDToName[curr].toLowerCase().includes(searchTerm.toLowerCase());
    }, false);
};
