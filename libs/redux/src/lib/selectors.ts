import {
    computeAccountBalanceHistory,
    computeAccountBalances,
    computeGroupSettlement,
    getTransactionSortFunc,
    TransactionSortMode,
} from "@abrechnung/core";
import { Account, AccountBalanceMap, Transaction, TransactionBalanceEffect } from "@abrechnung/types";
import { fromISOString } from "@abrechnung/utils";
import { selectGroupAccounts } from "./accounts";
import {
    selectGroupTransactionsWithoutWip,
    selectGroupTransactionsWithWip,
    selectTransactionBalanceEffects,
    selectWipTransactionBalanceEffects,
} from "./transactions";
import { AccountSliceState, AccountState, IRootState } from "./types";
import { getGroupScopedState } from "./utils";
import { useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";

export const selectAccountBalances = createSelector(
    (state: IRootState, groupId: number) => selectGroupTransactionsWithoutWip(state, groupId),
    (state: IRootState, groupId: number) => selectGroupAccounts(state, groupId),
    (transactions, accounts): AccountBalanceMap => {
        return computeAccountBalances(accounts, transactions);
    }
);

export const selectAccountBalanceHistory = createSelector(
    (state: IRootState, groupId: number) => selectGroupTransactionsWithoutWip(state, groupId),
    (state: IRootState, groupId: number) => selectGroupAccounts(state, groupId, "clearing"),
    (state: IRootState, groupId: number) => selectAccountBalances(state, groupId),
    (state: IRootState, groupId: number) => selectTransactionBalanceEffects(state, groupId),
    (_, __, accountId: number) => accountId,
    (transactions, clearingAccounts, balances, balanceEffects, accountId) => {
        return computeAccountBalanceHistory(accountId, clearingAccounts, balances, transactions, balanceEffects);
    }
);

export const selectTagsInGroup = createSelector(
    (state: IRootState, groupId: number) => selectGroupTransactionsWithWip(state, groupId),
    (state: IRootState, groupId: number) => selectGroupAccounts(state, groupId, "clearing"),
    (transactions, clearingAccounts) => {
        const transactionTags = transactions.map((t) => t.tags).flat();
        const accountTags = clearingAccounts.map((a) => (a.type === "clearing" ? a.tags : [])).flat();
        return Array.from(new Set([...transactionTags, ...accountTags])).sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase())
        );
    }
);

const emptyList: string[] = [];

const selectSortedTransactions = createSelector(
    (state: IRootState, groupId: number) => selectGroupTransactionsWithWip(state, groupId),
    (state: IRootState, groupId: number) => selectTransactionBalanceEffects(state, groupId),
    (state: IRootState, groupId: number) => selectWipTransactionBalanceEffects(state, groupId),
    (state: IRootState, groupId: number) =>
        getGroupScopedState<AccountState, AccountSliceState>(state.accounts, groupId).accounts.byId,
    (state: IRootState, groupId: number, sortMode: TransactionSortMode) => sortMode,
    (state: IRootState, groupId: number, sortMode: TransactionSortMode, searchTerm?: string) => searchTerm,
    (state: IRootState, groupId: number, sortMode: TransactionSortMode, searchTerm?: string, tags?: string[]) =>
        tags ?? emptyList,
    (
        transactions: Transaction[],
        balanceEffects: { [k: number]: TransactionBalanceEffect },
        wipBalanceEffects: { [k: number]: TransactionBalanceEffect },
        accountsById: { [k: number]: Account },
        sortMode: TransactionSortMode,
        searchTerm: string | undefined,
        tags: string[]
    ) => {
        const compareFunction = getTransactionSortFunc(sortMode);
        // TODO: this has optimization potential
        const filterFn = (t: Transaction): boolean => {
            if (tags.length > 0 && t.tags) {
                for (const tag of tags) {
                    if (!t.tags.includes(tag)) {
                        return false;
                    }
                }
            }

            if (searchTerm && searchTerm !== "") {
                if (
                    (t.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    fromISOString(t.billed_at).toDateString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                    fromISOString(t.last_changed).toDateString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                    String(t.value).includes(searchTerm.toLowerCase())
                ) {
                    return true;
                }
                const balanceEffect = wipBalanceEffects[t.id] ?? balanceEffects[t.id];
                return Object.keys(balanceEffect).reduce((acc: boolean, curr: string): boolean => {
                    const account = accountsById[Number(curr)];
                    return acc || account.name.toLowerCase().includes(searchTerm.toLowerCase());
                }, false);
            }

            return true;
        };
        console.log(transactions.filter(filterFn));
        return transactions.filter(filterFn).sort(compareFunction);
    }
);

export const useSortedTransactions = (
    groupId: number,
    sortMode: TransactionSortMode,
    searchTerm?: string,
    tags: string[] = []
): Transaction[] => {
    return useSelector((state: IRootState) => selectSortedTransactions(state, groupId, sortMode, searchTerm, tags));
};

export const selectSettlementPlan = createSelector(
    (state: IRootState, groupId: number) => selectAccountBalances(state, groupId),
    (balances) => {
        return computeGroupSettlement(balances);
    }
);
