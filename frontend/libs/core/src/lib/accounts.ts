import {
    Account,
    AccountBalanceMap,
    Transaction,
    ClearingAccount,
    TransactionPosition,
    ClearingShares,
    TransactionBalanceEffect,
} from "@abrechnung/types";
import { fromISOString } from "@abrechnung/utils";
import { computeTransactionBalanceEffect } from "./transactions";

export type AccountSortMode = "lastChanged" | "name" | "description" | "dateInfo";

export const getAccountSortFunc = (sortMode: AccountSortMode, wipAtTop = false) => {
    const sortingLookup = {
        personal: 50,
        clearing: 100,
    };
    const baseComparer = (a1: Account, a2: Account) => {
        if (wipAtTop) {
            return sortingLookup[a1.type] - sortingLookup[a2.type] || +a2.isWip - +a1.isWip;
        }
        return sortingLookup[a1.type] - sortingLookup[a2.type];
    };
    const lastChangeComparer = (a1: Account, a2: Account) => {
        return fromISOString(a2.lastChanged).getTime() - fromISOString(a1.lastChanged).getTime();
    };
    switch (sortMode) {
        case "lastChanged":
            return (a1: Account, a2: Account) => baseComparer(a1, a2) || lastChangeComparer(a1, a2);
        case "name":
            return (a1: Account, a2: Account) =>
                baseComparer(a1, a2) || a1.name.toLowerCase().localeCompare(a2.name.toLowerCase());
        case "description":
            return (a1: Account, a2: Account) =>
                baseComparer(a1, a2) || a1.description.toLowerCase().localeCompare(a2.description.toLowerCase());
        case "dateInfo":
            return (a1: Account, a2: Account) =>
                baseComparer(a1, a2) ||
                (a1.type === "clearing" &&
                a2.type === "clearing" &&
                a1.dateInfo !== "" &&
                a1.dateInfo != null &&
                a2.dateInfo !== "" &&
                a2.dateInfo != null
                    ? fromISOString(a1.dateInfo).getTime() - fromISOString(a2.dateInfo).getTime()
                    : lastChangeComparer(a1, a2));
    }
};

export const computeAccountBalances = (
    accounts: Account[],
    transactions: Transaction[],
    transactionToPositions: { [k: number]: TransactionPosition[] }
): AccountBalanceMap => {
    const s = performance.now();
    const accountBalances: AccountBalanceMap = accounts.reduce<AccountBalanceMap>((balances, account) => {
        balances[account.id] = {
            balance: 0,
            beforeClearing: 0,
            totalConsumed: 0,
            totalPaid: 0,
            clearingResolution: {},
        };
        return balances;
    }, {});

    const balanceEffects = transactions.map((t) =>
        computeTransactionBalanceEffect(t, transactionToPositions[t.id] ?? [])
    );

    for (const balanceEffect of balanceEffects) {
        for (const accountIdStr in balanceEffect) {
            const accountId = Number(accountIdStr);
            const balance = accountBalances[accountId];
            if (balance) {
                balance.balance += balanceEffect[accountId].total;
                balance.totalConsumed += balanceEffect[accountId].commonDebitors + balanceEffect[accountId].positions;
                balance.totalPaid += balanceEffect[accountId].commonCreditors;
                balance.beforeClearing = balance.balance;
            }
        }
    }

    // linearize the account dependency graph to properly redistribute clearing accounts
    const shareMap: Map<number, ClearingShares> = accounts.reduce((map, acc) => {
        if (acc.type === "clearing" && Object.keys(acc.clearingShares).length) {
            map.set(acc.id, acc.clearingShares);
        }
        return map;
    }, new Map<number, ClearingShares>());
    const clearingDependencies: Map<number, Set<number>> = new Map();
    const inDegree: Map<number, number> = new Map(accounts.map((a: Account) => [a.id, 0]));

    shareMap.forEach((shares: ClearingShares, accountID: number) => {
        // TODO: maybe functionalize
        for (const nextAccountIDStr of Object.keys(shares)) {
            const nextAccountID = Number(nextAccountIDStr);

            const degree = inDegree.get(nextAccountID);
            if (degree !== undefined) {
                inDegree.set(nextAccountID, degree + 1);
            }
            const dependencies = clearingDependencies.get(nextAccountID);
            if (dependencies) {
                dependencies.add(accountID);
            } else {
                clearingDependencies.set(nextAccountID, new Set<number>([accountID]));
            }
        }
    });
    const zeroDegreeAccounts: number[] = [...shareMap.keys()].filter(
        (accountID) => inDegree.get(accountID) === 0 || inDegree.get(accountID) === undefined // TODO: check whether undefined check makes sense here
    );
    const sorting = [];

    while (zeroDegreeAccounts.length > 0) {
        const node = zeroDegreeAccounts.pop();
        if (node === undefined) {
            throw new Error("error computing transaction balances");
        }
        const shares = shareMap.get(node);
        if (shares !== undefined) {
            sorting.push(node);
            for (const nextAccountIDStr of Object.keys(shares)) {
                const nextAccountID = Number(nextAccountIDStr);
                const degree = inDegree.get(nextAccountID);
                if (degree) {
                    const newDegree = degree - 1;
                    inDegree.set(nextAccountID, newDegree);
                    if (newDegree <= 0) {
                        zeroDegreeAccounts.push(nextAccountID);
                    }
                }
            }
        }
    }

    for (const clearing of sorting) {
        const clearingShares = shareMap.get(clearing);
        if (clearingShares === undefined || Object.keys(clearingShares).length === 0) {
            continue;
        }

        const balance = accountBalances[clearing];
        if (balance === undefined) {
            continue;
        }

        const toSplit = balance.balance;
        balance.balance = 0;
        const totalShares = [...Object.values(clearingShares)].reduce((acc: number, curr: number) => curr + acc, 0);
        for (const [accIDStr, shares] of Object.entries(clearingShares)) {
            const accID = Number(accIDStr);
            const accShare = (toSplit * shares) / totalShares;
            const clearingBalance = accountBalances[clearing];
            if (clearingBalance === undefined) {
                console.error("unexpected error");
                continue;
            }
            const clearingResolutionAcc = clearingBalance.clearingResolution[accID];
            if (clearingResolutionAcc) {
                clearingBalance.clearingResolution[accID] = clearingResolutionAcc + accShare;
            } else {
                clearingBalance.clearingResolution[accID] = accShare;
            }

            const accBalance = accountBalances[accID];
            if (accBalance) {
                accBalance.balance += accShare;
                if (accShare > 0) {
                    accBalance.totalPaid += Math.abs(accShare);
                } else {
                    accBalance.totalConsumed += Math.abs(accShare);
                }
            }
        }
    }

    console.log("computeAccountBalances took " + (performance.now() - s) + " milliseconds.");
    return accountBalances;
};

export interface BalanceChangeOrigin {
    type: "clearing" | "transaction";
    id: number;
}

export interface BalanceHistoryEntry {
    date: string;
    change: number;
    balance: number;
    changeOrigin: BalanceChangeOrigin;
}

export const computeAccountBalanceHistory = (
    accountId: number,
    clearingAccounts: ClearingAccount[],
    balances: AccountBalanceMap,
    transactions: Transaction[], // sorted after last change date
    transactionBalanceEffects: { [k: number]: TransactionBalanceEffect }
): BalanceHistoryEntry[] => {
    if (transactions.length === 0) {
        return [];
    }

    const balanceChanges: Omit<BalanceHistoryEntry, "balance">[] = [];
    for (const transaction of transactions) {
        const balanceEffect = transactionBalanceEffects[transaction.id];
        const a = balanceEffect[accountId];
        if (a) {
            balanceChanges.push({
                date: transaction.billedAt,
                change: a.total,
                changeOrigin: {
                    type: "transaction",
                    id: transaction.id,
                },
            });
        }
    }

    for (const account of clearingAccounts) {
        if (balances[account.id]?.clearingResolution[accountId] !== undefined) {
            balanceChanges.push({
                date: account.dateInfo,
                change: balances[account.id].clearingResolution[accountId],
                changeOrigin: {
                    type: "clearing",
                    id: account.id,
                },
            });
        }
    }
    balanceChanges.sort((a1, a2) => a1.date.localeCompare(a2.date));

    const accumulatedBalanceChanges: BalanceHistoryEntry[] = [];
    let currBalance = 0;
    for (const change of balanceChanges) {
        currBalance += change.change;
        accumulatedBalanceChanges.push({
            ...change,
            balance: currBalance,
        });
    }

    return accumulatedBalanceChanges;
};

export type SettlementPlan = Array<{ creditorId: number; debitorId: number; paymentAmount: number }>;
type SimplifiedBalances = Array<[number, number]>; // map of account ids to balances

const balanceSortCompareFn = (a: [number, number], b: [number, number]) => {
    return Math.abs(a[1]) - Math.abs(b[1]);
};

// assumes a sorted balance list
const extractOneToOneSettlements = (
    creditors: SimplifiedBalances,
    debitors: SimplifiedBalances,
    result: SettlementPlan
): void => {
    // all input parameters are also output parameters
    let credI = 0;
    let debI = 0;
    while (credI < creditors.length && debI < debitors.length) {
        const [creditor, creditorBalance] = creditors[credI];
        const [debitor, debitorBalance] = debitors[debI];
        if (Math.abs(creditorBalance) === Math.abs(debitorBalance)) {
            creditors.splice(credI, 1);
            debitors.splice(debI, 1);
            result.push({ creditorId: debitor, debitorId: creditor, paymentAmount: creditorBalance });
            continue;
        } else if (debI == debitors.length - 1) {
            credI++;
        } else if (credI == creditors.length - 1) {
            debI++;
        } else if (Math.abs(creditorBalance) < Math.abs(debitorBalance)) {
            credI++;
        } else {
            debI++;
        }
    }
};

export const computeGroupSettlement = (balances: AccountBalanceMap): SettlementPlan => {
    const b: SimplifiedBalances = Object.entries(balances).map(([accountId, balance]) => {
        return [Number(accountId), balance.balance];
    }, {});
    const creditors = b.filter(([, balance]) => balance > 0);
    const debitors = b.filter(([, balance]) => balance < 0);

    const result: SettlementPlan = [];
    while (creditors.length > 0 && debitors.length > 0) {
        creditors.sort(balanceSortCompareFn);
        debitors.sort(balanceSortCompareFn);
        extractOneToOneSettlements(creditors, debitors, result);
        const nextDebitor = debitors.pop();
        const nextCreditor = creditors.pop();
        if (nextDebitor == undefined || nextCreditor == undefined) {
            break;
        }
        const [debitor, debitorBalance] = nextDebitor;
        const [creditor, creditorBalance] = nextCreditor;

        let amount;
        if (Math.abs(debitorBalance) > Math.abs(creditorBalance)) {
            amount = Math.abs(creditorBalance);
        } else {
            amount = Math.abs(debitorBalance);
        }
        result.push({ creditorId: debitor, debitorId: creditor, paymentAmount: amount });
        const newDebitorBalance = debitorBalance + amount;
        if (newDebitorBalance < 0) {
            debitors.push([debitor, newDebitorBalance]);
        }

        const newCreditorBalance = creditorBalance - amount;
        if (newCreditorBalance > 0) {
            creditors.push([creditor, newCreditorBalance]);
        }
    }

    return result;
};
