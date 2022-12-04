import {
    Account,
    AccountBalanceMap,
    Transaction,
    TransactionPosition,
    ClearingShares,
    TransactionBalanceEffect,
} from "@abrechnung/types";
import { fromISOString } from "@abrechnung/utils";

export type AccountSortMode = "lastChanged" | "name" | "description";

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
    switch (sortMode) {
        case "lastChanged":
            return (a1: Account, a2: Account) =>
                baseComparer(a1, a2) ||
                fromISOString(a2.lastChanged).getTime() - fromISOString(a1.lastChanged).getTime();
        case "name":
            return (a1: Account, a2: Account) =>
                baseComparer(a1, a2) || a1.name.toLowerCase().localeCompare(a2.name.toLowerCase());
        case "description":
            return (a1: Account, a2: Account) =>
                baseComparer(a1, a2) || a1.description.toLowerCase().localeCompare(a2.description.toLowerCase());
    }
};

export const computeAccountBalances = (
    accounts: Account[],
    transactions: Transaction[],
    positions: TransactionPosition[]
): AccountBalanceMap => {
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

    const transactionValuesAfterPositions: Map<number, number> = new Map(
        transactions.map((t: Transaction) => [t.id, t.value])
    );

    for (const position of positions) {
        if (position.deleted) {
            continue; // ignore deleted positions
        }
        const totalUsages =
            position.communistShares + Object.values(position.usages).reduce((acc, curr) => acc + curr, 0);
        Object.entries(position.usages).forEach(([accountID, value]) => {
            const balance = accountBalances[Number(accountID)];
            if (balance) {
                const change = (position.price * value) / totalUsages;
                balance.balance += -change;
                balance.totalConsumed += change;
                balance.beforeClearing = balance.balance;
            }
        });
        const commonRemainder = totalUsages > 0 ? (position.price / totalUsages) * position.communistShares : 0;
        const transactionValueAfterPositions = transactionValuesAfterPositions.get(position.transactionID);
        if (transactionValueAfterPositions) {
            transactionValuesAfterPositions.set(
                position.transactionID,
                transactionValueAfterPositions - position.price + commonRemainder
            );
        }
    }

    for (const transaction of transactions) {
        if (transaction.deleted) {
            continue; // ignore deleted transactions
        }
        const totalCreditors = Object.values(transaction.creditorShares).reduce((acc, curr) => acc + curr, 0);
        const totalDebitors = Object.values(transaction.debitorShares).reduce((acc, curr) => acc + curr, 0);
        Object.entries(transaction.creditorShares).forEach(([accountID, value]) => {
            const balance = accountBalances[Number(accountID)];
            if (balance) {
                const change = (transaction.value * value) / totalCreditors;
                balance.balance += change;
                balance.totalPaid += change;
                balance.beforeClearing = balance.balance;
            }
        });
        Object.entries(transaction.debitorShares).forEach(([accountID, value]) => {
            const balance = accountBalances[Number(accountID)];
            const transactionValueAfterPositions = transactionValuesAfterPositions.get(transaction.id);
            if (balance && transactionValueAfterPositions) {
                const change = (transactionValueAfterPositions * value) / totalDebitors;
                balance.balance += -change;
                balance.totalConsumed += change;
                balance.beforeClearing = balance.balance;
            }
        });
    }

    // linearize the account dependency graph to properly redistribute clearing accounts
    const shareMap: Map<number, ClearingShares> = accounts.reduce((map, acc) => {
        if (acc.type === "clearing" && acc.clearingShares != null && Object.keys(acc.clearingShares).length) {
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
            const shares = shareMap.get(nextAccountID);
            const degree = inDegree.get(nextAccountID);
            if (shares && degree) {
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
    const zeroDegreeAccounts: Array<number> = [...shareMap.keys()].filter(
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

    return accountBalances;
};

export interface BalanceHistoryEntry {
    date: number;
    change: number;
    balance: number;
    changeOrigin: { type: "clearing" | "transaction"; id: number };
}

export const computeAccountBalanceHistory = (
    accountId: number,
    clearingAccounts: Account[],
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
                date: fromISOString(transaction.lastChanged).getTime() / 1000,
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
                date: fromISOString(account.lastChanged).getTime() / 1000,
                change: balances[account.id].clearingResolution[accountId],
                changeOrigin: {
                    type: "clearing",
                    id: account.id,
                },
            });
        }
    }
    balanceChanges.sort((a1, a2) => a1.date - a2.date);

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
