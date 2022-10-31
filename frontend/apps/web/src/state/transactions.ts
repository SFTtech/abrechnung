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
    TransactionContainer,
    TransactionAttachment,
    TransactionAccountBalance,
    TransactionBalanceEffect,
} from "@abrechnung/types";
import { localStorageEffect } from "./cache";
import {
    computeAccountBalances,
    computeAccountBalancesForTransaction as computeTransactionBalanceEffect,
} from "@abrechnung/core";

export const transactionCompareFn = (t1: Transaction, t2: Transaction) => {
    if (t1.hasUnpublishedChanges && !t2.hasUnpublishedChanges) {
        return -1;
    } else if (!t1.hasUnpublishedChanges && t2.hasUnpublishedChanges) {
        return 1;
    }
    return t2.lastChanged.getTime() - t1.lastChanged.getTime();
};

export type TransactionSortMode = "lastChanged" | "value" | "description" | "billedAt";

export const getTransactionSortFunc = (sortMode: TransactionSortMode) => {
    switch (sortMode) {
        case "lastChanged":
            return (t1: Transaction, t2: Transaction) =>
                +t2.hasUnpublishedChanges - +t1.hasUnpublishedChanges ||
                t2.lastChanged.getTime() - t1.lastChanged.getTime();
        case "value":
            return (t1: Transaction, t2: Transaction) =>
                +t2.hasUnpublishedChanges - +t1.hasUnpublishedChanges || t2.value - t1.value;
        case "description":
            return (t1: Transaction, t2: Transaction) =>
                +t2.hasUnpublishedChanges - +t1.hasUnpublishedChanges || t1.description.localeCompare(t2.description);
        case "billedAt":
            return (t1: Transaction, t2: Transaction) =>
                +t2.hasUnpublishedChanges - +t1.hasUnpublishedChanges || t2.billedAt.getTime() - t1.billedAt.getTime();
        default:
            throw new Error("unknown transaction sort mode");
    }
};

export const groupTransactionContainers = atomFamily<TransactionContainer[], number>({
    key: "groupTransactions",
    effects: (groupID: number) => [
        ({ setSelf, node, getPromise }) => {
            console.log("group transactions", groupID);
            const fullFetchPromise = (): Promise<TransactionContainer[]> => {
                return api.fetchTransactions(groupID).catch((err) => {
                    toast.error(`error when fetching transactions: ${err}`);
                    return [];
                });
            };

            // TODO: handle fetch error more properly than just showing error, e.g. through a retry or something
            setSelf(fullFetchPromise());

            const fetchAndUpdateTransaction = (
                currTransactions: TransactionContainer[],
                transactionID: number,
                isNew: boolean
            ) => {
                api.fetchTransaction(transactionID)
                    .then((transaction) => {
                        if (isNew) {
                            setSelf([...currTransactions, transaction]);
                        } else {
                            setSelf(
                                currTransactions.map((t) =>
                                    t.transaction.id === transaction.transaction.id ? transaction : t
                                )
                            );
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
                            const currTransaction = currTransactions.find((t) => t.transaction.id === transaction_id);
                            if (
                                currTransaction === undefined ||
                                //(revision_committed === null && revision_version > currTransaction.version) ||
                                (revision_committed !== null &&
                                    (currTransaction.transaction.lastChanged === null ||
                                        DateTime.fromISO(revision_committed) >
                                            DateTime.fromJSDate(currTransaction.transaction.lastChanged)))
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

export const addTransactionInState = (
    transaction: TransactionContainer,
    setTransactions: SetterOrUpdater<Array<TransactionContainer>>
) => {
    setTransactions((currTransactions: Array<TransactionContainer>) => {
        return [...currTransactions, transaction];
    });
};

export const updateTransactionInState = (
    transaction: TransactionContainer,
    setTransactions: SetterOrUpdater<Array<TransactionContainer>>
) => {
    setTransactions((currTransactions: Array<TransactionContainer>) => {
        return currTransactions.map((t) => (t.transaction.id === transaction.transaction.id ? transaction : t));
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

export const pendingTransactionDetailChanges = atomFamily<LocalTransactionDetailChanges, number>({
    // transaction id -> pending changes
    key: "pendingTransactionDetailChanges",
    default: {},
    effects: (transactionID) => [localStorageEffect(`localTransactionChanges-${transactionID}`)],
});

export const pendingTransactionPositionChanges = atomFamily<LocalPositionChanges, number>({
    // transaction id -> pending changes
    key: "pendingTransactionPositionChanges",
    default: (transactionID: number) => {
        return {
            modified: {}, // map of positions with server given ids
            added: {}, // map of positions with local id to content
            empty: {
                id: -1,
                transactionID: transactionID,
                name: "",
                price: 0,
                communistShares: 0,
                usages: {},
                deleted: false,
            },
        };
    },
    effects: (transactionID) => [localStorageEffect(`localTransactionPositionChanges-${transactionID}`)],
});

export const groupTransactions = selectorFamily<Transaction[], number>({
    key: "groupTransactions",
    get:
        (groupID: number) =>
        async ({ get }) => {
            console.log("transaction details", groupID);
            const transactions = get(groupTransactionContainers(groupID));
            return transactions
                .map((t: TransactionContainer) => {
                    const localDetailChanges = get(pendingTransactionDetailChanges(t.transaction.id));
                    return {
                        ...t.transaction,
                        ...localDetailChanges,
                    };
                })
                .sort(transactionCompareFn);
        },
});

export const transactionByID = selectorFamily<Transaction | undefined, { groupID: number; transactionID: number }>({
    key: "transactionByID",
    get:
        ({ groupID, transactionID }) =>
        async ({ get }) => {
            const transactions = get(groupTransactions(groupID));
            return transactions.find((t) => t.id === transactionID);
        },
});

export const groupPositions = selectorFamily<TransactionPosition[], number>({
    key: "groupPositions",
    get:
        (groupID: number) =>
        async ({ get }) => {
            const containers = get(groupTransactionContainers(groupID));
            return containers
                .map((t: TransactionContainer) => {
                    const localPositionChanges = get(pendingTransactionPositionChanges(t.transaction.id));
                    const newPositions = t.positions
                        .map((p) =>
                            localPositionChanges.modified[p.id] !== undefined ? localPositionChanges.modified[p.id] : p
                        )
                        .concat(Object.values(localPositionChanges.added));
                    return newPositions;
                })
                .flat();
        },
});

export const transactionPositions = selectorFamily<TransactionPosition[], { groupID: number; transactionID: number }>({
    key: "transactionPositions",
    get:
        ({ groupID, transactionID }) =>
        async ({ get }) => {
            const positions = get(groupPositions(groupID));
            return positions.filter((p) => p.transactionID === transactionID);
        },
});

export const transactionAttachments = selectorFamily<
    TransactionAttachment[] | undefined,
    { groupID: number; transactionID: number }
>({
    key: "transactionAttachments",
    get:
        ({ groupID, transactionID }) =>
        async ({ get }) => {
            const containers = get(groupTransactionContainers(groupID));
            return containers.find((t) => t.transaction.id === transactionID)?.attachments;
        },
});

export const transactionBalanceEffect = selectorFamily<
    TransactionBalanceEffect | undefined,
    { groupID: number; transactionID: number }
>({
    key: "transactionAccountBalance",
    get:
        ({ groupID, transactionID }) =>
        async ({ get }) => {
            const transaction = get(transactionByID({ groupID, transactionID }));
            if (transaction === undefined) {
                return undefined;
            }

            const positions = get(transactionPositions({ groupID, transactionID }));
            return computeTransactionBalanceEffect(transaction, positions);
        },
});

interface TransactionWithBalanceEffect extends Transaction {
    balanceEffect: TransactionBalanceEffect;
}

export const groupTransactionsWithBalanceEffect = selectorFamily<TransactionWithBalanceEffect[], number>({
    key: "groupTransactionsWithBalanceEffect",
    get:
        (groupID) =>
        async ({ get }) => {
            const transactions = get(groupTransactions(groupID));
            return transactions.map((t) => {
                return { ...t, balanceEffect: get(transactionBalanceEffect({ groupID, transactionID: t.id })) };
            });
        },
});

export const transactionByIDMap = selectorFamily<{ [k: number]: Transaction }, number>({
    key: "transactionByIDMap",
    get:
        (groupID) =>
        async ({ get }) => {
            const transactions = get(groupTransactions(groupID));
            return transactions.reduce((map, curr) => {
                map[curr.id] = curr;
                return map;
            }, {});
        },
});

export const accountBalances = selectorFamily<AccountBalanceMap, number>({
    key: "accountBalances",
    get:
        (groupID) =>
        async ({ get }) => {
            const transactions = get(groupTransactions(groupID));
            const positions = get(groupPositions(groupID));
            const accounts = get(accountsSeenByUser(groupID));
            return computeAccountBalances(accounts, transactions, positions);
        },
});

export const accountTransactions = selectorFamily<Transaction[], { groupID: number; accountID: number }>({
    key: "accountTransactions",
    get:
        ({ groupID, accountID }) =>
        async ({ get }) => {
            const transactions = get(groupTransactions(groupID));
            return transactions.filter((transaction) => {
                const balanceEffect = get(transactionBalanceEffect({ groupID, transactionID: transaction.id }));
                return balanceEffect[accountID] !== undefined;
            });
        },
});

export interface BalanceHistoryEntry {
    date: number;
    change: number;
    balance: number;
    changeOrigin: { type: "clearing" | "transaction"; id: number };
}

export const accountBalanceHistory = selectorFamily<BalanceHistoryEntry[], { groupID: number; accountID: number }>({
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
                const balanceEffect = get(transactionBalanceEffect({ groupID, transactionID: transaction.id }));
                const a = balanceEffect[accountID];
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
        },
});
