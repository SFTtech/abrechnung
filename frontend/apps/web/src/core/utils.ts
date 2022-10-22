import { useLocation } from "react-router-dom";
import { DateTime } from "luxon";
import { useEffect } from "react";
import { Theme } from "@mui/material";
import { Transaction } from "@abrechnung/types";

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
    searchTerm: string,
    accountIDToName: { [k: number]: string }
): boolean => {
    if (
        transaction.details.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        DateTime.fromJSDate(transaction.details.billedAt)
            .toLocaleString(DateTime.DATE_FULL)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
        DateTime.fromJSDate(transaction.lastChanged)
            .toLocaleString(DateTime.DATE_FULL)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
        String(transaction.details.value).includes(searchTerm.toLowerCase())
    ) {
        return true;
    }

    return Object.keys(transaction.accountBalances).reduce((acc, curr) => {
        return acc || accountIDToName[curr].toLowerCase().includes(searchTerm.toLowerCase());
    }, false);
};
