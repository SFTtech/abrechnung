import { Account, Transaction, TransactionBalanceEffect } from "@abrechnung/types";
import { buildCsv, fromISOString } from "@abrechnung/utils";
import { getCurrencySymbolForIdentifier } from "./currency";

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
    let remainingTransactionValue = transaction.value * transaction.currency_conversion_rate;
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
                    totalUsages > 0 ? (position.price / totalUsages) * value * transaction.currency_conversion_rate : 0;
            } else {
                accountBalances[Number(accountID)] = {
                    positions:
                        totalUsages > 0
                            ? (position.price / totalUsages) * value * transaction.currency_conversion_rate
                            : 0,
                    commonCreditors: 0,
                    commonDebitors: 0,
                    total: 0,
                };
            }
        });

        // calculate the remaining purchase item price to be billed onto the communist shares
        const commonRemainder =
            totalUsages > 0
                ? (position.price / totalUsages) * position.communist_shares * transaction.currency_conversion_rate
                : 0;
        remainingTransactionValue =
            remainingTransactionValue - position.price * transaction.currency_conversion_rate + commonRemainder;
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
                totalcreditor_shares > 0
                    ? (transaction.value / totalcreditor_shares) * value * transaction.currency_conversion_rate
                    : 0;
        } else {
            accountBalances[Number(accountID)] = {
                positions: 0,
                commonCreditors:
                    totalcreditor_shares > 0
                        ? (transaction.value / totalcreditor_shares) * value * transaction.currency_conversion_rate
                        : 0,
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

export const transactionCsvDump = (
    transactions: Transaction[],
    balanceEffects: { [id: number]: TransactionBalanceEffect },
    accounts: Account[]
): string => {
    const transactionsSorted = [...transactions]
        .filter((t) => !t.is_wip)
        .sort((t1, t2) => t1.billed_at.localeCompare(t2.billed_at));

    const accountMap = Object.fromEntries(
        accounts.filter((acc) => !acc.deleted).map((acc) => [`account-${acc.id}`, acc.name])
    );

    const csvHeaders = {
        id: "ID",
        date: "Date",
        payer: "Payer",
        name: "Name",
        description: "Description",
        currency_identifier: "Currency Identifier",
        currency_symbol: "Currency Symbol",
        currency_conversion_rate: "Currency Conversion Rate",
        tags: "Tags",
        value: "Value",
        ...accountMap,
    };

    const data = [];

    for (const transaction of transactionsSorted) {
        const balanceEffect = balanceEffects[transaction.id];
        const creditorId = Object.keys(transaction.creditor_shares)[0];
        const creditorName = accountMap[`account-${creditorId}`];
        const tags = transaction.tags.join(",");

        const rowData = {
            id: transaction.id,
            date: transaction.billed_at,
            payer: creditorName,
            name: transaction.name,
            description: transaction.description,
            currency_identifier: transaction.currency_identifier,
            currency_symbol: getCurrencySymbolForIdentifier(transaction.currency_identifier),
            currency_conversion_rate: transaction.currency_conversion_rate,
            tags: tags,
            value: transaction.value.toFixed(2),
            ...Object.fromEntries(
                accounts.map((acc) => [`account-${acc.id}`, balanceEffect[acc.id]?.total.toFixed(2) ?? ""])
            ),
        };
        data.push(rowData);
    }
    return buildCsv(csvHeaders, data);
};
