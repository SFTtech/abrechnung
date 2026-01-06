import { Account, FrontendSplitMode, Transaction, TransactionBalanceEffect, TransactionShare } from "@abrechnung/types";
import { buildCsv, fromISOString } from "@abrechnung/utils";
import { getCurrencySymbolForIdentifier } from "./currency";
import { SplitMode } from "@abrechnung/api";

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

const normalizeShares = (shares: TransactionShare) => {
    const totalShares = Object.values(shares).reduce((acc, curr) => acc + curr, 0);
    if (totalShares !== 0) {
        Object.keys(shares).forEach((accountID) => {
            shares[Number(accountID)] = shares[Number(accountID)] / totalShares;
        });
    }
};

const scaleShares = (shares: TransactionShare, factor: number) => {
    Object.keys(shares).forEach((accountID) => {
        shares[Number(accountID)] = shares[Number(accountID)] * factor;
    });
};

export const getDebitorSharesAfterSplitModeChange = (
    previousSplitMode: SplitMode,
    newSplitMode: FrontendSplitMode,
    previousDebitorShares: TransactionShare,
    transactionValue: number
): { newDebitorShares: TransactionShare; splitMode: SplitMode } => {
    if (previousSplitMode === newSplitMode) {
        return { newDebitorShares: previousDebitorShares, splitMode: previousSplitMode };
    }
    if (newSplitMode === "evenly") {
        const newDebitors = Object.fromEntries(
            Object.entries(previousDebitorShares).map(([accountID, value]) => [accountID, value !== 0 ? 1 : 0])
        );
        return { splitMode: "shares", newDebitorShares: newDebitors };
    }
    if (newSplitMode === "absolute") {
        // handle transition to absolute
        const totalShares = Object.values(previousDebitorShares).reduce((acc, curr) => acc + curr, 0);
        if (totalShares === 0) {
            // avoid division by zero - just return previous shares
            return { splitMode: "absolute", newDebitorShares: previousDebitorShares };
        }
        // both shares and percent split mode can be handled the same way to convert them to absolute values
        const newDebitors = Object.fromEntries(
            Object.entries(previousDebitorShares).map(([accountID, share]) => [
                accountID,
                (transactionValue / totalShares) * share,
            ])
        );
        return { splitMode: "absolute", newDebitorShares: newDebitors };
    }
    if (previousSplitMode === "absolute") {
        const newDebitors = Object.fromEntries(
            Object.entries(previousDebitorShares).map(([accountID, share]) => [
                accountID,
                share / (transactionValue !== 0 ? transactionValue : 1),
            ])
        );
        if (newSplitMode === "percent") {
            // normalize the shares to sum up to 1
            normalizeShares(newDebitors);
        } else {
            // shares are already calculated in 0.X (percent essentially) for nicer formatting we multiply by 10 to display them nicely
            scaleShares(newDebitors, 10);
        }
        return { splitMode: newSplitMode, newDebitorShares: newDebitors };
    }
    if (previousSplitMode === "shares" && newSplitMode === "percent") {
        // normalize the shares to sum up to 1
        const newDebitors = { ...previousDebitorShares };
        normalizeShares(newDebitors);
        return { splitMode: "percent", newDebitorShares: newDebitors };
    }
    if (previousSplitMode === "percent" && newSplitMode === "shares") {
        // multiple all shares by 10 -> 10% -> 1 share
        const newDebitors = { ...previousDebitorShares };
        scaleShares(newDebitors, 10);
        return { splitMode: "shares", newDebitorShares: newDebitors };
    }
    return { splitMode: newSplitMode, newDebitorShares: previousDebitorShares };
};

export const computeTransactionBalanceEffect = (transaction: Transaction): TransactionBalanceEffect => {
    const accountBalances: TransactionBalanceEffect = {};
    let remainingTransactionValue = transaction.value * transaction.currency_conversion_rate;
    if (transaction.split_mode === "absolute" && transaction.position_ids.length !== 0) {
        throw new Error(
            "Absolute split mode with positions is not supported - something went wrong as this state should never be possible"
        );
    }

    for (const id of transaction.position_ids) {
        // ignore the split mode in this complete block - we can assume no absolute split mode here due to the check above
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

    const totalDebitorShares: number = Object.values(transaction.debitor_shares).reduce((acc, curr) => acc + curr, 0);
    const totalCreditorShares: number = Object.values(transaction.creditor_shares).reduce((acc, curr) => acc + curr, 0);

    Object.entries(transaction.debitor_shares).forEach(([accountID, debitorShare]) => {
        let debitorShareAbsoluteValue = 0;
        if (totalDebitorShares !== 0) {
            if (transaction.split_mode === "absolute") {
                debitorShareAbsoluteValue = debitorShare;
            } else {
                // split_mode is either "shares" or "percent" -> both are handled the same way
                debitorShareAbsoluteValue = (remainingTransactionValue / totalDebitorShares) * debitorShare;
            }
        }
        if (accountBalances[Number(accountID)] !== undefined) {
            accountBalances[Number(accountID)].commonDebitors += debitorShareAbsoluteValue;
        } else {
            accountBalances[Number(accountID)] = {
                positions: 0,
                commonCreditors: 0,
                commonDebitors: debitorShareAbsoluteValue,
                total: 0,
            };
        }
    });
    Object.entries(transaction.creditor_shares).forEach(([accountID, value]) => {
        if (accountBalances[Number(accountID)] !== undefined) {
            accountBalances[Number(accountID)].commonCreditors +=
                totalCreditorShares > 0
                    ? (transaction.value / totalCreditorShares) * value * transaction.currency_conversion_rate
                    : 0;
        } else {
            accountBalances[Number(accountID)] = {
                positions: 0,
                commonCreditors:
                    totalCreditorShares > 0
                        ? (transaction.value / totalCreditorShares) * value * transaction.currency_conversion_rate
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
