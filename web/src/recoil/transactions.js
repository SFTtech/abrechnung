import { atomFamily, selectorFamily } from "recoil";
import { fetchTransaction, fetchTransactions } from "../api";
import { ws } from "../websocket";
import { DateTime } from "luxon";
import { toast } from "react-toastify";
import { accountsSeenByUser } from "./accounts";
import { localStorageEffect } from "./cache";

export const groupTransactions = atomFamily({
    key: "groupTransactions",
    default: [],
    effects_UNSTABLE: (groupID) => [
        ({ setSelf, node, getPromise }) => {
            const fullFetchPromise = () => {
                return fetchTransactions({ groupID: groupID })
                    .then((result) => {
                        return result;
                    })
                    .catch((err) => {
                        toast.error(`error when fetching transactions: ${err}`);
                        return [];
                    });
            };

            const partialFetchPromise = (currTransactions) => {
                let maxChangedTime = currTransactions.reduce((acc, curr) => {
                    if (curr.committed_details != null && curr.committed_details.committed_at != null) {
                        return Math.max(DateTime.fromISO(curr.committed_details.committed_at).toSeconds(), acc);
                    }
                    return acc;
                }, 0);
                if (maxChangedTime === 0) {
                    return fullFetchPromise();
                }

                const wipTransactions = currTransactions.reduce((acc, curr) => {
                    if (curr.is_wip) {
                        return [...acc, curr.id];
                    }
                    return acc;
                }, []);

                return fetchTransactions({
                    groupID: groupID,
                    minLastChanged: DateTime.fromSeconds(maxChangedTime),
                    additionalTransactions: wipTransactions,
                })
                    .then((result) => {
                        let mappedTransactions = currTransactions.reduce((map, transaction) => {
                            map[transaction.id] = transaction;
                            return map;
                        }, {});
                        for (const newTransaction of result) {
                            mappedTransactions[newTransaction.id] = newTransaction;
                        }
                        return Object.values(mappedTransactions);
                    })
                    .catch((err) => {
                        toast.error(`error when fetching transactions: ${err}`);
                        return currTransactions;
                    });
            };

            // TODO: handle fetch error more properly than just showing error, e.g. through a retry or something
            setSelf(fullFetchPromise());

            const fetchAndUpdateTransaction = (currTransactions, transactionID, isNew) => {
                fetchTransaction({ transactionID: transactionID })
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
                    if (element_id === groupID) {
                        getPromise(node).then((currTransactions) => {
                            const currTransaction = currTransactions.find((t) => t.id === transaction_id);
                            if (
                                currTransaction === undefined ||
                                (revision_committed === null && revision_version > currTransaction.version) ||
                                (revision_committed !== null &&
                                    (currTransaction.last_changed === null ||
                                        DateTime.fromISO(revision_committed) >
                                            DateTime.fromISO(currTransaction.last_changed)))
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

export const addTransactionInState = (transaction, setTransactions) => {
    setTransactions((currTransactions) => {
        return [...currTransactions, transaction];
    });
};

export const updateTransactionInState = (transaction, setTransactions) => {
    setTransactions((currTransactions) => {
        return currTransactions.map((t) => (t.id === transaction.id ? transaction : t));
    });
};

export const pendingTransactionDetailChanges = atomFamily({
    // transaction id -> pending changes
    key: "pendingTransactionDetailChanges",
    default: {},
    effects_UNSTABLE: (transactionID) => [localStorageEffect(`localTransactionChanges-${transactionID}`)],
});

export const pendingTransactionPositionChanges = atomFamily({
    // transaction id -> pending changes
    key: "pendingTransactionPositionChanges",
    default: {
        modified: {}, // map of positions with server given ids
        added: {}, // map of positions with local id to content
        empty: {
            id: -1,
            name: "",
            price: 0,
            communist_shares: 0,
            usages: {},
        },
    },
    effects_UNSTABLE: (transactionID) => [localStorageEffect(`localTransactionPositionChanges-${transactionID}`)],
});

export const transactionsSeenByUser = selectorFamily({
    key: "transactionsSeenByUser",
    get:
        (groupID) =>
        async ({ get }) => {
            const transactions = get(groupTransactions(groupID));

            return transactions
                .filter((transaction) => {
                    return !(transaction.committed_details && transaction.committed_details.deleted);
                })
                .map((transaction) => {
                    const localDetailChanges = get(pendingTransactionDetailChanges(transaction.id));
                    const localPositionChanges = get(pendingTransactionPositionChanges(transaction.id));
                    let mapped = {
                        id: transaction.id,
                        type: transaction.type,
                        version: transaction.version,
                        last_changed: transaction.last_changed,
                        group_id: transaction.group_id,
                        is_wip: transaction.is_wip,
                        files:
                            transaction.committed_files != null
                                ? transaction.committed_files.filter((file) => !file.deleted)
                                : [],
                    };
                    if (transaction.pending_details) {
                        mapped = {
                            ...mapped,
                            ...transaction.pending_details,
                            ...localDetailChanges, // patch with local, non-synced changes
                            has_committed_changes: transaction.committed_details != null,
                        };
                    } else {
                        mapped = {
                            ...mapped,
                            ...transaction.committed_details,
                            ...localDetailChanges, // patch with local, non-synced changes
                            has_committed_changes: true,
                        };
                    }

                    let positions =
                        transaction.committed_positions != null
                            ? transaction.committed_positions
                                  .filter((position) => !position.deleted)
                                  .map((t) => ({
                                      ...t,
                                      only_local: false,
                                  }))
                            : [];

                    if (transaction.pending_positions || Object.keys(localPositionChanges.modified).length > 0) {
                        let mappedPosition = positions.reduce((map, position) => {
                            map[position.id] = position;
                            return map;
                        }, {});

                        if (transaction.pending_positions) {
                            for (const pendingPosition of transaction.pending_positions) {
                                mappedPosition[pendingPosition.id] = {
                                    ...pendingPosition,
                                    only_local: false,
                                };
                            }
                        }
                        if (localPositionChanges.modified) {
                            for (const localPosition of Object.values(localPositionChanges.modified)) {
                                mappedPosition[localPosition.id] = {
                                    ...localPosition,
                                    only_local: false,
                                };
                            }
                        }
                        positions = Object.values(mappedPosition).filter((position) => !position.deleted);
                    }
                    mapped.purchase_items = positions.concat(
                        Object.values(localPositionChanges.added).map((p) => ({
                            ...p,
                            only_local: true,
                        }))
                    );

                    if (transaction.pending_files) {
                        let mappedFiles = mapped.files.reduce((map, file) => {
                            map[file.id] = file;
                            return map;
                        }, {});
                        for (const pendingFile of transaction.pending_files) {
                            mappedFiles[pendingFile.id] = pendingFile;
                        }
                        mapped.files = Object.values(mappedFiles).filter((file) => !file.deleted);
                    }

                    return mapped;
                })
                .map((transaction) => {
                    let transactionAccountBalances = {};
                    let remainingTransactionValue = transaction.value;
                    if (transaction.purchase_items != null && transaction.purchase_items.length > 0) {
                        for (const purchaseItem of transaction.purchase_items) {
                            if (purchaseItem.deleted) {
                                continue;
                            }

                            let totalUsages =
                                purchaseItem.communist_shares +
                                Object.values(purchaseItem.usages).reduce((acc, curr) => acc + curr, 0);

                            // bill the respective item usage with each participating account
                            Object.entries(purchaseItem.usages).forEach(([accountID, value]) => {
                                if (transactionAccountBalances.hasOwnProperty(accountID)) {
                                    transactionAccountBalances[accountID]["positions"] +=
                                        totalUsages > 0 ? (purchaseItem.price / totalUsages) * value : 0;
                                } else {
                                    transactionAccountBalances[accountID] = {
                                        positions: totalUsages > 0 ? (purchaseItem.price / totalUsages) * value : 0,
                                        common_debitors: 0,
                                        common_creditors: 0,
                                    };
                                }
                            });

                            // calculate the remaining purchase item price to be billed onto the communist shares
                            const commonRemainder =
                                totalUsages > 0
                                    ? (purchaseItem.price / totalUsages) * purchaseItem.communist_shares
                                    : 0;
                            remainingTransactionValue =
                                remainingTransactionValue - purchaseItem.price + commonRemainder;
                        }
                    }

                    const totalDebitorShares = Object.values(transaction.debitor_shares).reduce(
                        (acc, curr) => acc + curr,
                        0
                    );
                    const totalCreditorShares = Object.values(transaction.creditor_shares).reduce(
                        (acc, curr) => acc + curr,
                        0
                    );

                    Object.entries(transaction.debitor_shares).forEach(([accountID, value]) => {
                        if (transactionAccountBalances.hasOwnProperty(accountID)) {
                            transactionAccountBalances[accountID]["common_debitors"] +=
                                totalDebitorShares > 0 ? (remainingTransactionValue / totalDebitorShares) * value : 0;
                        } else {
                            transactionAccountBalances[accountID] = {
                                positions: 0,
                                common_creditors: 0,
                                common_debitors:
                                    totalDebitorShares > 0
                                        ? (remainingTransactionValue / totalDebitorShares) * value
                                        : 0,
                            };
                        }
                    });
                    Object.entries(transaction.creditor_shares).forEach(([accountID, value]) => {
                        if (transactionAccountBalances.hasOwnProperty(accountID)) {
                            transactionAccountBalances[accountID]["common_creditors"] +=
                                totalCreditorShares > 0 ? (transaction.value / totalCreditorShares) * value : 0;
                        } else {
                            transactionAccountBalances[accountID] = {
                                positions: 0,
                                common_debitors: 0,
                                common_creditors:
                                    totalCreditorShares > 0 ? (transaction.value / totalCreditorShares) * value : 0,
                            };
                        }
                    });

                    return {
                        ...transaction,
                        account_balances: transactionAccountBalances,
                    };
                })
                .sort((t1, t2) => {
                    return t1.billed_at === t2.billed_at
                        ? t1.id < t2.id
                        : DateTime.fromISO(t1.billed_at).toMillis() < DateTime.fromISO(t2.billed_at).toMillis();
                });
        },
});

export const transactionById = selectorFamily({
    key: "transactionById",
    get:
        ({ groupID, transactionID }) =>
        async ({ get }) => {
            const transactions = get(transactionsSeenByUser(groupID));
            return transactions?.find((transaction) => transaction.id === transactionID);
        },
});

export const accountBalances = selectorFamily({
    key: "accountBalances",
    get:
        (groupID) =>
        async ({ get }) => {
            const transactions = get(transactionsSeenByUser(groupID));
            const accounts = get(accountsSeenByUser(groupID));
            let accountBalances = Object.fromEntries(
                accounts.map((account) => [
                    account.id,
                    {
                        balance: 0,
                        totalConsumed: 0,
                        totalPaid: 0,
                    },
                ])
            );

            for (const transaction of transactions) {
                if (transaction.deleted) {
                    continue; // ignore deleted transactions
                }
                Object.entries(transaction.account_balances).forEach(([accountID, value]) => {
                    accountBalances[accountID].totalConsumed += value.positions + value.common_debitors;
                    accountBalances[accountID].totalPaid += value.common_creditors;
                    accountBalances[accountID].balance +=
                        value.common_creditors - value.positions - value.common_debitors;
                });
            }

            // linearize the account dependency graph to properly redistribute clearing accounts
            let shareMap = accounts.reduce((map, acc) => {
                if (acc.clearing_shares != null && Object.keys(acc.clearing_shares).length) {
                    map[acc.id] = acc.clearing_shares;
                }
                return map;
            }, {});
            let clearingDependencies = {};
            let inDegree = accounts.reduce((map, curr) => {
                map[curr.id] = 0;
                return map;
            }, {});
            for (const accountID of Object.keys(shareMap)) {
                // TODO: maybe functionalize
                for (const nextAccountID of Object.keys(shareMap[accountID])) {
                    if (shareMap.hasOwnProperty(nextAccountID)) {
                        inDegree[nextAccountID] += 1;
                    }
                    if (clearingDependencies.hasOwnProperty(nextAccountID)) {
                        clearingDependencies[nextAccountID].add(accountID);
                    } else {
                        clearingDependencies[nextAccountID] = new Set([accountID]);
                    }
                }
            }
            let zeroDegreeAccounts = Object.keys(shareMap).filter((accountID) => inDegree[accountID] === 0);
            let sorting = [];

            while (zeroDegreeAccounts.length > 0) {
                const node = zeroDegreeAccounts.pop();
                if (shareMap.hasOwnProperty(node)) {
                    sorting.push(node);
                    for (const nextAccount of Object.keys(shareMap[node])) {
                        inDegree[nextAccount] -= 1;
                        if (inDegree[nextAccount] <= 0) {
                            zeroDegreeAccounts.push(nextAccount);
                        }
                    }
                }
            }

            for (const clearing of sorting) {
                if (shareMap.hasOwnProperty(clearing) && Object.keys(shareMap[clearing]).length > 0) {
                    const toSplit = accountBalances[clearing].balance;
                    accountBalances[clearing].balance = 0;
                    const totalShares = Object.values(shareMap[clearing]).reduce((acc, curr) => curr + acc, 0);
                    for (const acc in shareMap[clearing]) {
                        const accShare = (toSplit * shareMap[clearing][acc]) / totalShares;
                        accountBalances[acc].balance += accShare;
                        if (accShare > 0) {
                            accountBalances[acc].totalPaid += Math.abs(accShare);
                        } else {
                            accountBalances[acc].totalConsumed += Math.abs(accShare);
                        }
                    }
                }
            }

            return accountBalances;
        },
});

export const accountTransactions = selectorFamily({
    key: "accountTransactions",
    get:
        ({ groupID, accountID }) =>
        async ({ get }) => {
            return get(transactionsSeenByUser(groupID)).filter((transaction) =>
                transaction.account_balances.hasOwnProperty(accountID)
            );
        },
});

export const accountBalanceHistory = selectorFamily({
    key: "accountBalanceHistory",
    get:
        ({ groupID, accountID }) =>
        async ({ get }) => {
            const unsortedTransactions = get(accountTransactions({ groupID: groupID, accountID: accountID }));
            const transactions = [...unsortedTransactions].sort((t1, t2) => {
                return DateTime.fromISO(t1.billed_at).toMillis() > DateTime.fromISO(t2.billed_at).toMillis();
            });

            if (transactions.length === 0) {
                return [];
            }

            let balanceChanges = [];
            let currentEntry = {
                date: DateTime.fromISO(transactions[0].billed_at).toSeconds(),
                balance: 0,
            };
            for (const transaction of transactions) {
                const transactionDate = DateTime.fromISO(transaction.billed_at).toSeconds();
                if (transactionDate !== currentEntry.date) {
                    balanceChanges.push({ ...currentEntry });
                    currentEntry.date = transactionDate;
                }

                const a = transaction.account_balances[accountID];
                currentEntry.balance += a.common_creditors - a.common_debitors - a.positions;
            }
            balanceChanges.push({ ...currentEntry });

            return balanceChanges;
        },
});
