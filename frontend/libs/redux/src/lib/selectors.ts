import { IRootState } from "./types";
import memoize from "proxy-memoize";
import { selectGroupAccountsInternal, selectGroupAccountsFilteredInternal } from "./accounts";
import { AccountBalanceMap } from "@abrechnung/types";
import { BalanceHistoryEntry, computeAccountBalanceHistory, computeAccountBalances } from "@abrechnung/core";
import {
    selectGroupTransactionsInternal,
    selectGroupPositionsInternal,
    selectTransactionBalanceEffectsInternal,
} from "./transactions";

const selectAccountBalancesInternal = (args: { state: IRootState; groupId: number }): AccountBalanceMap => {
    const { state, groupId } = args;
    const transactions = selectGroupTransactionsInternal({ state: state.transactions, groupId });
    const positions = selectGroupPositionsInternal({ state: state.transactions, groupId });
    const accounts = selectGroupAccountsInternal({ state: state.accounts, groupId });
    return computeAccountBalances(accounts, transactions, positions);
};

export const selectAccountBalances = memoize(selectAccountBalancesInternal);

export const selectAccountBalanceHistory = memoize(
    (args: { state: IRootState; groupId: number; accountId: number }): BalanceHistoryEntry[] => {
        const { state, groupId, accountId } = args;
        const transactions = selectGroupTransactionsInternal({ state: state.transactions, groupId });
        const clearingAccounts = selectGroupAccountsFilteredInternal({
            state: state.accounts,
            groupId,
            type: "clearing",
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
            isOwner: member.isOwner,
            canWrite: member.canWrite,
        };
    }
);
