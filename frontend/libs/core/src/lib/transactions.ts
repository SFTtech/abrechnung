import { Transaction, TransactionBalanceEffect } from "@abrechnung/types";
import { fromISOString } from "@abrechnung/utils";

export type TransactionSortMode = "last_changed" | "value" | "name" | "description" | "billed_at";

export const transactionCompareFn = (t1: Transaction, t2: Transaction) => {
    if (t1.is_wip && !t2.is_wip) {
        return -1;
    } else if (!t1.is_wip && t2.is_wip) {
        return 1;
    }
    return fromISOString(t2.last_changed).getTime() - fromISOString(t1.last_changed).getTime();
};

export const getTransactionSortFunc = (
    sortMode: TransactionSortMode
): ((t1: Transaction, t2: Transaction) => number) => {
    switch (sortMode) {
        case "last_changed":
            return (t1, t2) =>
                +t2.is_wip - +t1.is_wip ||
                fromISOString(t2.last_changed).getTime() - fromISOString(t1.last_changed).getTime();
        case "value":
            return (t1, t2) => +t2.is_wip - +t1.is_wip || t2.value - t1.value;
        case "description":
            return (t1, t2) => +t2.is_wip - +t1.is_wip || (t1.description || "").localeCompare(t2.description || "");
        case "name":
            return (t1, t2) => +t2.is_wip - +t1.is_wip || t1.name.localeCompare(t2.name);
        case "billed_at":
            return (t1, t2) => +t2.is_wip - +t1.is_wip || t2.billed_at.localeCompare(t1.billed_at); // TODO: is this the correct order for billed at comparison
    }
};

export const computeTransactionBalanceEffect = (transaction: Transaction): TransactionBalanceEffect => {
    const accountBalances: TransactionBalanceEffect = {};
    let remainingTransactionValue = transaction.value;
    for (const id of transaction.position_ids) {
        const position = transaction.positions[id];
        if (position.deleted) {
            continue;
        }

        const totalUsages: number =
            position.communist_shares +
            Object.values<number>(position.usages).reduce<number>((acc, curr) => acc + curr, 0);

        // bill the respective item usage with each participating account
        Object.entries(position.usages).forEach(([accountID, value]: [string, number]) => {
            if (accountBalances[Number(accountID)] !== undefined) {
                accountBalances[Number(accountID)].positions +=
                    totalUsages > 0 ? (position.price / totalUsages) * value : 0;
            } else {
                accountBalances[Number(accountID)] = {
                    positions: totalUsages > 0 ? (position.price / totalUsages) * value : 0,
                    commonCreditors: 0,
                    commonDebitors: 0,
                    total: 0,
                };
            }
        });

        // calculate the remaining purchase item price to be billed onto the communist shares
        const commonRemainder = totalUsages > 0 ? (position.price / totalUsages) * position.communist_shares : 0;
        remainingTransactionValue = remainingTransactionValue - position.price + commonRemainder;
    }

    const totaldebitor_shares: number = Object.values(transaction.debitor_shares).reduce((acc, curr) => acc + curr, 0);
    const totalcreditor_shares: number = Object.values(transaction.creditor_shares).reduce(
        (acc, curr) => acc + curr,
        0
    );

    Object.entries(transaction.debitor_shares).forEach(([accountID, value]) => {
        if (accountBalances[Number(accountID)] !== undefined) {
            accountBalances[Number(accountID)].commonDebitors +=
                totaldebitor_shares > 0 ? (remainingTransactionValue / totaldebitor_shares) * value : 0;
        } else {
            accountBalances[Number(accountID)] = {
                positions: 0,
                commonCreditors: 0,
                commonDebitors: totaldebitor_shares > 0 ? (remainingTransactionValue / totaldebitor_shares) * value : 0,
                total: 0,
            };
        }
    });
    Object.entries(transaction.creditor_shares).forEach(([accountID, value]) => {
        if (accountBalances[Number(accountID)] !== undefined) {
            accountBalances[Number(accountID)].commonCreditors +=
                totalcreditor_shares > 0 ? (transaction.value / totalcreditor_shares) * value : 0;
        } else {
            accountBalances[Number(accountID)] = {
                positions: 0,
                commonCreditors: totalcreditor_shares > 0 ? (transaction.value / totalcreditor_shares) * value : 0,
                commonDebitors: 0,
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
