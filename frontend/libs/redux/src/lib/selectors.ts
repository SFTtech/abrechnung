import {
    BalanceHistoryEntry,
    computeAccountBalanceHistory,
    computeAccountBalances,
    computeGroupSettlement,
    getTransactionSortFunc,
    SettlementPlan,
    TransactionSortMode,
} from "@abrechnung/core";
import { AccountBalanceMap, Transaction } from "@abrechnung/types";
import { fromISOString } from "@abrechnung/utils";
import memoize from "proxy-memoize";
import { selectClearingAccountsInternal, selectGroupAccountsInternal } from "./accounts";
import {
    selectGroupTransactionsWithoutWipInternal,
    selectGroupTransactionsWithWipInternal,
    selectTransactionBalanceEffectsInternal,
} from "./transactions";
import { AccountSliceState, AccountState, IRootState } from "./types";
import { getGroupScopedState } from "./utils";

const selectAccountBalancesInternal = (args: { state: IRootState; groupId: number }): AccountBalanceMap => {
    const s = performance.now();
    const { state, groupId } = args;
    const transactions = selectGroupTransactionsWithoutWipInternal({ state: state.transactions, groupId });
    const accounts = selectGroupAccountsInternal({ state: state.accounts, groupId });
    const res = computeAccountBalances(accounts, transactions);
    console.log("selectAccountBalancesInternal took " + (performance.now() - s) + " milliseconds.");
    return res;
};

export const selectAccountBalances = memoize(selectAccountBalancesInternal, { size: 5 });

export const selectAccountBalanceHistory = memoize(
    (args: { state: IRootState; groupId: number; accountId: number }): BalanceHistoryEntry[] => {
        const { state, groupId, accountId } = args;
        const transactions = selectGroupTransactionsWithoutWipInternal({ state: state.transactions, groupId });
        const clearingAccounts = selectClearingAccountsInternal({
            state: state.accounts,
            groupId,
        });
        const balances = selectAccountBalancesInternal({ state, groupId });
        const balanceEffects = selectTransactionBalanceEffectsInternal({ state: state.transactions, groupId });
        return computeAccountBalanceHistory(accountId, clearingAccounts, balances, transactions, balanceEffects);
    }
);

export const selectCurrentUserPermissions = memoize(
    (args: { state: IRootState; groupId: number }): { isOwner: boolean; canWrite: boolean } | undefined => {
        const { state, groupId } = args;
        if (state.auth.profile === undefined) {
            return undefined;
        }

        const userId = state.auth.profile.id;

        if (
            state.groups.byGroupId[groupId] === undefined ||
            state.groups.byGroupId[groupId].groupMembersStatus !== "initialized"
        ) {
            return undefined;
        }
        const member = state.groups.byGroupId[groupId].groupMembers.byId[userId];
        if (member === undefined) {
            return undefined;
        }
        return {
            isOwner: member.is_owner,
            canWrite: member.can_write,
        };
    }
);

export const selectTagsInGroup = memoize((args: { state: IRootState; groupId: number }): string[] => {
    const { state, groupId } = args;
    const transactions = selectGroupTransactionsWithWipInternal({ state: state.transactions, groupId });
    const clearingAccounts = selectClearingAccountsInternal({
        state: state.accounts,
        groupId,
    });

    const transactionTags = transactions.map((t) => t.tags).flat();
    const accountTags = clearingAccounts.map((a) => (a.type === "clearing" ? a.tags : [])).flat();
    return Array.from(new Set([...transactionTags, ...accountTags])).sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
    );
});

export const selectSortedTransactions = memoize(
    (args: {
        state: IRootState;
        groupId: number;
        sortMode: TransactionSortMode;
        searchTerm?: string;
        tags?: string[];
    }): Transaction[] => {
        const { state, groupId, sortMode, searchTerm, tags = [] } = args;
        const s = getGroupScopedState<AccountState, AccountSliceState>(state.accounts, groupId);
        const balanceEffects = selectTransactionBalanceEffectsInternal({ state: state.transactions, groupId });
        const transactions = selectGroupTransactionsWithWipInternal({ state: state.transactions, groupId });
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
                return Object.keys(balanceEffects[t.id]).reduce((acc: boolean, curr: string): boolean => {
                    const account = s.accounts.byId[Number(curr)];
                    return acc || account.name.toLowerCase().includes(searchTerm.toLowerCase());
                }, false);
            }

            return true;
        };

        return transactions.filter(filterFn).sort(compareFunction);
    },
    { size: 5 }
);

export const selectSettlementPlan = memoize((args: { state: IRootState; groupId: number }): SettlementPlan => {
    const { state, groupId } = args;
    const balances = selectAccountBalancesInternal({ state, groupId });
    return computeGroupSettlement(balances);
});
