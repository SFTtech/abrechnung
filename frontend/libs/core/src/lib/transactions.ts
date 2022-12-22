import { Transaction, TransactionBalanceEffect, TransactionPosition } from "@abrechnung/types";
import { fromISOString } from "@abrechnung/utils";

export type TransactionSortMode = "lastChanged" | "value" | "name" | "description" | "billedAt";

export const transactionCompareFn = (t1: Transaction, t2: Transaction) => {
    if (t1.isWip && !t2.isWip) {
        return -1;
    } else if (!t1.isWip && t2.isWip) {
        return 1;
    }
    return fromISOString(t2.lastChanged).getTime() - fromISOString(t1.lastChanged).getTime();
};

export const getTransactionSortFunc = (sortMode: TransactionSortMode) => {
    switch (sortMode) {
        case "lastChanged":
            return (t1: Transaction, t2: Transaction) =>
                +t2.isWip - +t1.isWip ||
                fromISOString(t2.lastChanged).getTime() - fromISOString(t1.lastChanged).getTime();
        case "value":
            return (t1: Transaction, t2: Transaction) => +t2.isWip - +t1.isWip || t2.value - t1.value;
        case "description":
            return (t1: Transaction, t2: Transaction) =>
                +t2.isWip - +t1.isWip || (t1.description || "").localeCompare(t2.description || "");
        case "name":
            return (t1: Transaction, t2: Transaction) => +t2.isWip - +t1.isWip || t1.name.localeCompare(t2.name);
        case "billedAt":
            return (t1: Transaction, t2: Transaction) =>
                +t2.isWip - +t1.isWip || t2.billedAt.localeCompare(t1.billedAt); // TODO: is this the correct order for billed at comparison
    }
};

export const computeAccountBalancesForTransaction = (
    transaction: Transaction,
    positions: TransactionPosition[]
): TransactionBalanceEffect => {
    const accountBalances: TransactionBalanceEffect = {};
    let remainingTransactionValue = transaction.value;
    if (positions.length > 0) {
        for (const position of positions) {
            if (position.deleted) {
                continue;
            }

            const totalUsages =
                position.communistShares + Object.values(position.usages).reduce((acc, curr) => acc + curr, 0);

            // bill the respective item usage with each participating account
            Object.entries(position.usages).forEach(([accountID, value]) => {
                if (accountBalances[Number(accountID)] !== undefined) {
                    accountBalances[Number(accountID)].positions +=
                        totalUsages > 0 ? (position.price / totalUsages) * value : 0;
                } else {
                    accountBalances[Number(accountID)] = {
                        positions: totalUsages > 0 ? (position.price / totalUsages) * value : 0,
                        commonDebitors: 0,
                        commonCreditors: 0,
                        total: 0,
                    };
                }
            });

            // calculate the remaining purchase item price to be billed onto the communist shares
            const commonRemainder = totalUsages > 0 ? (position.price / totalUsages) * position.communistShares : 0;
            remainingTransactionValue = remainingTransactionValue - position.price + commonRemainder;
        }
    }

    const totalDebitorShares: number = Object.values(transaction.debitorShares).reduce((acc, curr) => acc + curr, 0);
    const totalCreditorShares: number = Object.values(transaction.creditorShares).reduce((acc, curr) => acc + curr, 0);

    Object.entries(transaction.debitorShares).forEach(([accountID, value]) => {
        if (accountBalances[Number(accountID)] !== undefined) {
            accountBalances[Number(accountID)].commonDebitors +=
                totalDebitorShares > 0 ? (remainingTransactionValue / totalDebitorShares) * value : 0;
        } else {
            accountBalances[Number(accountID)] = {
                positions: 0,
                commonCreditors: 0,
                commonDebitors: totalDebitorShares > 0 ? (remainingTransactionValue / totalDebitorShares) * value : 0,
                total: 0,
            };
        }
    });
    Object.entries(transaction.creditorShares).forEach(([accountID, value]) => {
        if (accountBalances[Number(accountID)] !== undefined) {
            accountBalances[Number(accountID)].commonCreditors +=
                totalCreditorShares > 0 ? (transaction.value / totalCreditorShares) * value : 0;
        } else {
            accountBalances[Number(accountID)] = {
                positions: 0,
                commonDebitors: 0,
                commonCreditors: totalCreditorShares > 0 ? (transaction.value / totalCreditorShares) * value : 0,
                total: 0,
            };
        }
    });

    for (const accountID in accountBalances) {
        const b = accountBalances[accountID];
        accountBalances[accountID].total = b.commonCreditors - b.positions - b.commonDebitors;
    }

    return accountBalances;
};
