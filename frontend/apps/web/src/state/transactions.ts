import { atomFamily, selectorFamily, SetterOrUpdater } from "recoil";
import { api, ws } from "../core/api";
import { DateTime } from "luxon";
import { toast } from "react-toastify";
import { accountsSeenByUser } from "./accounts";
import {
    Transaction,
    TransactionShare,
    AccountBalanceMap,
    TransactionPosition,
    TransactionDetails,
} from "@abrechnung/types";
import { localStorageEffect } from "./cache";
import { computeAccountBalances, computeAccountBalancesForTransaction } from "@abrechnung/core";

export const transactionCompareFn = (t1: Transaction, t2: Transaction) => {
    if (t1.isWip && !t2.isWip) {
        return -1;
    } else if (!t1.isWip && t2.isWip) {
        return 1;
    }
    return t2.lastChanged.getTime() - t1.lastChanged.getTime();
};

export type TransactionSortMode = "lastChanged" | "value" | "description" | "billedAt";

export const getTransactionSortFunc = (sortMode: TransactionSortMode) => {
    switch (sortMode) {
        case "lastChanged":
            return (t1: Transaction, t2: Transaction) =>
                +t2.isWip - +t1.isWip || t2.lastChanged.getTime() - t1.lastChanged.getTime();
        case "value":
            return (t1: Transaction, t2: Transaction) => +t2.isWip - +t1.isWip || t2.details.value - t1.details.value;
        case "description":
            return (t1: Transaction, t2: Transaction) =>
                +t2.isWip - +t1.isWip || t1.details.description.localeCompare(t2.details.description);
        case "billedAt":
            return (t1: Transaction, t2: Transaction) =>
                +t2.isWip - +t1.isWip || t2.details.billedAt.getTime() - t1.details.billedAt.getTime();
        default:
            throw new Error("unknown transaction sort mode");
    }
};

export const groupTransactions = atomFamily<Transaction[], number>({
    key: "groupTransactions",
    effects: (groupID: number) => [
        ({ setSelf, node, getPromise }) => {
            console.log("group transactions", groupID);
            const fullFetchPromise = (): Promise<Transaction[]> => {
                return api.fetchTransactions(groupID).catch((err) => {
                    toast.error(`error when fetching transactions: ${err}`);
                    return [];
                });
            };

            // TODO: handle fetch error more properly than just showing error, e.g. through a retry or something
            setSelf(fullFetchPromise());

            const fetchAndUpdateTransaction = (
                currTransactions: Transaction[],
                transactionID: number,
                isNew: boolean
            ) => {
                api.fetchTransaction(transactionID)
                    .then((transaction) => {
                        if (isNew) {
                            setSelf([...currTransactions, transaction]);
                        } else {
                            setSelf(currTransactions.map((t) => (t.id === transaction.id ? transaction : t)));
                        }
                    })
                    .catch((err) => toast.error(`error when fetching transaction: ${err}`));
            };

            ws.subscribe(
                "transaction",
                groupID,
                (
                    subscription_type,
                    { element_id, transaction_id, revision_started, revision_committed, revision_version }
                ) => {
                    console.log(
                        subscription_type,
                        transaction_id,
                        element_id,
                        revision_started,
                        revision_committed,
                        revision_version
                    );
                    if (element_id === groupID) {
                        getPromise(node).then((currTransactions) => {
                            const currTransaction = currTransactions.find((t) => t.id === transaction_id);
                            if (
                                currTransaction === undefined ||
                                (revision_committed === null && revision_version > currTransaction.version) ||
                                (revision_committed !== null &&
                                    (currTransaction.lastChanged === null ||
                                        DateTime.fromISO(revision_committed) >
                                            DateTime.fromJSDate(currTransaction.lastChanged)))
                            ) {
                                fetchAndUpdateTransaction(
                                    currTransactions,
                                    transaction_id,
                                    currTransaction === undefined
                                );
                            }
                        });
                    }
                }
            );
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("transaction", groupID);
            };
        },
    ],
});

export const transactionDetails = selectorFamily<TransactionDetails[], number>({
    key: "transactionDetails",
    get:
        (groupID: number) =>
        async ({ get }) => {
            console.log("transaction details", groupID);
            const transactions = get(groupTransactions(groupID));
            return transactions.map((t) => t.details);
        },
});

export const addTransactionInState = (
    transaction: Transaction,
    setTransactions: SetterOrUpdater<Array<Transaction>>
) => {
    setTransactions((currTransactions: Array<Transaction>) => {
        return [...currTransactions, transaction];
    });
};

export const updateTransactionInState = (
    transaction: Transaction,
    setTransactions: SetterOrUpdater<Array<Transaction>>
) => {
    setTransactions((currTransactions: Array<Transaction>) => {
        return currTransactions.map((t) => (t.id === transaction.id ? transaction : t));
    });
};

export interface LocalTransactionDetailChanges {
    description?: string;
    value?: number;
    currencySymbol?: string;
    currencyConversionSate?: number;
    creditorShares?: TransactionShare;
    debitorShares?: TransactionShare;
    billedAt?: Date;
    deleted?: boolean;
}

export interface LocalPositionChanges {
    modified: { [k: number]: TransactionPosition };
    added: { [k: number]: TransactionPosition };
    empty: TransactionPosition;
}

// TODO: remove any type here
export const pendingTransactionDetailChanges = atomFamily<LocalTransactionDetailChanges, number>({
    // transaction id -> pending changes
    key: "pendingTransactionDetailChanges",
    default: {},
    effects_UNSTABLE: (transactionID) => [localStorageEffect(`localTransactionChanges-${transactionID}`)],
});

export const pendingTransactionPositionChanges = atomFamily<LocalPositionChanges, number>({
    // transaction id -> pending changes
    key: "pendingTransactionPositionChanges",
    default: {
        modified: {}, // map of positions with server given ids
        added: {}, // map of positions with local id to content
        empty: {
            id: -1,
            name: "",
            price: 0,
            communistShares: 0,
            usages: {},
            deleted: false,
            hasLocalChanges: true,
        },
    },
    effects: (transactionID) => [localStorageEffect(`localTransactionPositionChanges-${transactionID}`)],
});

export const transactionsSeenByUser = selectorFamily<Array<Transaction>, number>({
    key: "transactionsSeenByUser",
    get:
        (groupID: number) =>
        async ({ get }) => {
            const transactions = get(groupTransactions(groupID));

            return transactions
                .map((t: Transaction) => {
                    const localDetailChanges = get(pendingTransactionDetailChanges(t.id));
                    const localPositionChanges = get(pendingTransactionPositionChanges(t.id));
                    const newPositions = t.positions
                        .map((p) =>
                            localPositionChanges.modified[p.id] !== undefined ? localPositionChanges.modified[p.id] : p
                        )
                        .concat(Object.values(localPositionChanges.added));

                    const details = {
                        ...t.details,
                        ...localDetailChanges,
                    };

                    return {
                        ...t,
                        details: details,
                        positions: newPositions,
                        accountBalances: computeAccountBalancesForTransaction(details, newPositions),
                    };
                })
                .sort(transactionCompareFn);
        },
});

export const transactionByIDMap = selectorFamily<{ [k: number]: Transaction }, number>({
    key: "transactionByIDMap",
    get:
        (groupID) =>
        async ({ get }) => {
            const transactions = get(transactionsSeenByUser(groupID));
            return transactions.reduce((map, curr) => {
                map[curr.id] = curr;
                return map;
            }, {});
        },
});

export type ParamGroupTransaction = {
    groupID: number;
    transactionID: number;
};

export const transactionById = selectorFamily<Transaction | undefined, ParamGroupTransaction>({
    key: "transactionById",
    get:
        ({ groupID, transactionID }) =>
        async ({ get }) => {
            const transactions = get(transactionsSeenByUser(groupID));
            return transactions?.find((transaction) => transaction.id === transactionID);
        },
});

export const transactionPositions = selectorFamily<TransactionPosition[], ParamGroupTransaction>({
    key: "transactionPositions",
    get:
        ({ groupID, transactionID }) =>
        async ({ get }) => {
            const transaction = get(transactionById({ groupID, transactionID }));
            if (transaction === undefined) {
                return [];
            }
            return transaction.positions;
        },
});

export const accountBalances = selectorFamily<AccountBalanceMap, number>({
    key: "accountBalances",
    get:
        (groupID) =>
        async ({ get }) => {
            const transactions = get(transactionsSeenByUser(groupID));
            const accounts = get(accountsSeenByUser(groupID));
            return computeAccountBalances(accounts, transactions);
        },
});

export type ParamGroupAccount = {
    groupID: number;
    accountID: number;
};

export const accountTransactions = selectorFamily<Array<Transaction>, ParamGroupAccount>({
    key: "accountTransactions",
    get:
        ({ groupID, accountID }) =>
        async ({ get }) => {
            return get(transactionsSeenByUser(groupID)).filter(
                (transaction) => transaction.accountBalances[accountID] !== undefined
            );
        },
});

export interface BalanceHistoryEntry {
    date: number;
    change: number;
    balance: number;
    changeOrigin: { type: "clearing" | "transaction"; id: number };
}

export const accountBalanceHistory = selectorFamily<Array<BalanceHistoryEntry>, ParamGroupAccount>({
    key: "accountBalanceHistory",
    get:
        ({ groupID, accountID }) =>
        async ({ get }) => {
            const balances = get(accountBalances(groupID));
            const accounts = get(accountsSeenByUser(groupID));
            const clearingAccounts = accounts.filter((a) => a.type === "clearing");
            const unsortedTransactions = get(accountTransactions({ groupID: groupID, accountID: accountID }));
            const transactions = [...unsortedTransactions].sort(transactionCompareFn);

            if (transactions.length === 0) {
                return [];
            }

            const balanceChanges = [];
            for (const transaction of transactions) {
                const a = transaction.accountBalances[accountID];
                balanceChanges.push({
                    date: transaction.lastChanged.getTime() / 1000,
                    change: a.total,
                    changeOrigin: {
                        type: "transaction",
                        id: transaction.id,
                    },
                });
            }

            for (const account of clearingAccounts) {
                if (balances.get(account.id)?.clearingResolution[accountID] !== undefined) {
                    balanceChanges.push({
                        date: DateTime.fromJSDate(account.lastChanged).toSeconds(),
                        change: balances.get(account.id)?.clearingResolution[accountID],
                        changeOrigin: {
                            type: "clearing",
                            id: account.id,
                        },
                    });
                }
            }
            balanceChanges.sort((a1, a2) => a1.date - a2.date);

            const accumulatedBalanceChanges: Array<BalanceHistoryEntry> = [];
            let currBalance = 0;
            for (const change of balanceChanges) {
                currBalance += change.change;
                accumulatedBalanceChanges.push({
                    ...change,
                    balance: currBalance,
                });
            }

            return accumulatedBalanceChanges;
        },
});
