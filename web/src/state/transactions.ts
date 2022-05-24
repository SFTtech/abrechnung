import { atomFamily, selectorFamily, SetterOrUpdater } from "recoil";
import { fetchTransaction, fetchTransactions } from "../api";
import { ws } from "../websocket";
import { DateTime } from "luxon";
import { toast } from "react-toastify";
import { accountsSeenByUser, ClearingShares } from "./accounts";
import { localStorageEffect } from "./cache";

export const transactionCompareFn = (t1: Transaction, t2: Transaction) => {
    if (t1.is_wip && !t2.is_wip) {
        return -1;
    } else if (!t1.is_wip && t2.is_wip) {
        return 1;
    }
    return t2.last_changed.toMillis() - t1.last_changed.toMillis();
};

export const getTransactionSortFunc = (sortMode: string) => {
    switch (sortMode) {
        case "last_changed":
        // return (t1: Transaction, t2: Transaction) => +t2.is_wip - +t1.is_wip || t2.last_changed.toMillis() - t1.last_changed.toMillis();
        case "value":
            return (t1: Transaction, t2: Transaction) => +t2.is_wip - +t1.is_wip || t2.value - t1.value;
        case "description":
            return (t1: Transaction, t2: Transaction) =>
                +t2.is_wip - +t1.is_wip || t1.description.localeCompare(t2.description);
        case "billed_at":
            return (t1: Transaction, t2: Transaction) =>
                +t2.is_wip - +t1.is_wip || t2.billed_at.toMillis() - t1.billed_at.toMillis();
        default:
            throw new Error("unknown transaction sort mode");
    }
};

export interface TransactionPosition {
    id: number;
    price: number;
    communist_shares: number;
    deleted: boolean;
    name: string;
    usages: PositionUsages;

    // not defined in upstream API
    only_local?: boolean;
}

export interface TransactionAttachment {
    id: number;
    filename: string;
    blob_id: number;
    deleted: boolean;
    url: string;
}

export type CreditorShares = { [k: number]: number };
export type DebitorShares = { [k: number]: number };
export type PositionUsages = { [k: number]: number };

export interface TransactionDetail {
    description: string;
    value: number;
    currency_symbol: string;
    currency_conversion_rate: number;
    billed_at: string;
    committed_at?: string;
    creditor_shares: CreditorShares;
    debitor_shares: DebitorShares;
    deleted: boolean;
}

export type TransactionType = "purchase" | "transfer" | "mimo";

export interface TransactionBackend {
    id: number;
    type: TransactionType;
    is_wip: boolean;
    last_changed: string;
    group_id: number;
    version: number;
    pending_details: TransactionDetail | null;
    committed_details: TransactionDetail | null;
    pending_positions: Array<TransactionPosition>;
    committed_positions: Array<TransactionPosition>;
    pending_files: Array<TransactionAttachment>;
    committed_files: Array<TransactionAttachment>;
}

export interface TransactionAccountBalance {
    total: number;
    positions: number;
    common_creditors: number;
    common_debitors: number;
}

export class Transaction {
    id: number;
    type: TransactionType;
    is_wip: boolean;
    last_changed: DateTime;
    group_id: number;
    version: number;
    description: string;
    value: number;
    currency_symbol: string;
    currency_conversion_rate: number;
    billed_at: DateTime;
    committed_at: DateTime | null;
    creditor_shares: CreditorShares;
    debitor_shares: DebitorShares;
    deleted: boolean;
    has_committed_changes: boolean;
    positions: Array<TransactionPosition>;
    files: Array<TransactionAttachment>;
    account_balances: { [k: number]: TransactionAccountBalance };

    constructor(
        id: number,
        type: TransactionType,
        is_wip: boolean,
        last_changed: string,
        group_id: number,
        version: number,
        description: string,
        value: number,
        currency_symbol: string,
        currency_conversion_rate: number,
        billed_at: string,
        creditor_shares: CreditorShares,
        debitor_shares: DebitorShares,
        deleted: boolean,
        has_committed_changes: boolean,
        positions: Array<TransactionPosition>,
        files: Array<TransactionAttachment>,
        committed_at?: string
    ) {
        this.id = id;
        this.type = type;
        this.is_wip = is_wip;
        this.last_changed = DateTime.fromISO(last_changed);
        this.group_id = group_id;
        this.version = version;
        this.description = description;
        this.value = value;
        this.currency_symbol = currency_symbol;
        this.currency_conversion_rate = currency_conversion_rate;
        this.billed_at = DateTime.fromISO(billed_at);
        this.committed_at = committed_at != null ? DateTime.fromISO(committed_at) : null;
        this.creditor_shares = creditor_shares;
        this.debitor_shares = debitor_shares;
        this.deleted = deleted;
        this.has_committed_changes = has_committed_changes;
        this.positions = positions;
        this.files = files;

        this.account_balances = {};
        let remainingTransactionValue = this.value !== undefined ? this.value : 0;
        if (this.positions != null && this.positions.length > 0) {
            for (const purchaseItem of this.positions) {
                if (purchaseItem.deleted) {
                    continue;
                }

                let totalUsages =
                    purchaseItem.communist_shares +
                    Object.values(purchaseItem.usages).reduce((acc, curr) => acc + curr, 0);

                // bill the respective item usage with each participating account
                Object.entries(purchaseItem.usages).forEach(([accountID, value]) => {
                    if (this.account_balances.hasOwnProperty(accountID)) {
                        this.account_balances[parseInt(accountID)]["positions"] +=
                            totalUsages > 0 ? (purchaseItem.price / totalUsages) * value : 0;
                    } else {
                        this.account_balances[parseInt(accountID)] = {
                            positions: totalUsages > 0 ? (purchaseItem.price / totalUsages) * value : 0,
                            common_debitors: 0,
                            common_creditors: 0,
                            total: 0,
                        };
                    }
                });

                // calculate the remaining purchase item price to be billed onto the communist shares
                const commonRemainder =
                    totalUsages > 0 ? (purchaseItem.price / totalUsages) * purchaseItem.communist_shares : 0;
                remainingTransactionValue = remainingTransactionValue - purchaseItem.price + commonRemainder;
            }
        }

        const totalDebitorShares = Object.values(this.debitor_shares).reduce((acc, curr) => acc + curr, 0);
        const totalCreditorShares = Object.values(this.creditor_shares).reduce((acc, curr) => acc + curr, 0);

        Object.entries(this.debitor_shares).forEach(([accountID, value]) => {
            if (this.account_balances.hasOwnProperty(accountID)) {
                this.account_balances[parseInt(accountID)]["common_debitors"] +=
                    totalDebitorShares > 0 ? (remainingTransactionValue / totalDebitorShares) * value : 0;
            } else {
                this.account_balances[parseInt(accountID)] = {
                    positions: 0,
                    common_creditors: 0,
                    common_debitors:
                        totalDebitorShares > 0 ? (remainingTransactionValue / totalDebitorShares) * value : 0,
                    total: 0,
                };
            }
        });
        Object.entries(this.creditor_shares).forEach(([accountID, value]) => {
            if (this.account_balances.hasOwnProperty(accountID)) {
                this.account_balances[parseInt(accountID)]["common_creditors"] +=
                    totalCreditorShares > 0 ? (this.value / totalCreditorShares) * value : 0;
            } else {
                this.account_balances[parseInt(accountID)] = {
                    positions: 0,
                    common_debitors: 0,
                    common_creditors: totalCreditorShares > 0 ? (this.value / totalCreditorShares) * value : 0,
                    total: 0,
                };
            }
        });

        for (const accountID in this.account_balances) {
            const b = this.account_balances[accountID];
            this.account_balances[accountID].total = b.common_creditors - b.positions - b.common_debitors;
        }
    }

    filter(filter: string): boolean {
        if (
            this.description.toLowerCase().includes(filter.toLowerCase()) ||
            this.billed_at.toLocaleString(DateTime.DATE_FULL).toLowerCase().includes(filter.toLowerCase()) ||
            this.last_changed.toLocaleString(DateTime.DATETIME_FULL).toLowerCase().includes(filter.toLowerCase()) ||
            String(this.value).includes(filter.toLowerCase())
        ) {
            return true;
        }

        // TODO: also be able to filter by account names here
        return false;
    }

    static fromBackendFormat(
        transaction: TransactionBackend,
        localDetailChanges: LocalTransactionDetailChanges,
        localPositionChanges: LocalPositionChanges
    ): Transaction {
        const has_committed_changes = transaction.committed_details != null;
        const transaction_details =
            transaction.pending_details !== null ? transaction.pending_details : transaction.committed_details;

        if (transaction_details == null) {
            throw new Error(
                "invalid transaction state: pending_details and committed_details should not be null at the same time"
            );
        }

        let positions: Array<TransactionPosition> =
            transaction.committed_positions != null
                ? transaction.committed_positions
                      .filter((position) => !position.deleted)
                      .map((t) => ({
                          ...t,
                          only_local: false,
                      }))
                : [];

        if (transaction.pending_positions || Object.keys(localPositionChanges.modified).length > 0) {
            let mappedPosition = positions.reduce((map: { [k: number]: TransactionPosition }, position) => {
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
        const all_positions = positions.concat(
            Object.values(localPositionChanges.added).map((p) => ({
                ...p,
                only_local: true,
            }))
        );

        let files: Array<TransactionAttachment> =
            transaction.committed_files != null ? transaction.committed_files.filter((file) => !file.deleted) : [];
        if (transaction.pending_files) {
            let mappedFiles = files.reduce((map: { [k: number]: TransactionAttachment }, file) => {
                map[file.id] = file;
                return map;
            }, {});
            for (const pendingFile of transaction.pending_files) {
                mappedFiles[pendingFile.id] = pendingFile;
            }
            files = Object.values(mappedFiles).filter((file) => !file.deleted);
        }

        return new Transaction(
            transaction.id,
            transaction.type,
            transaction.is_wip,
            transaction.last_changed,
            transaction.group_id,
            transaction.version,
            localDetailChanges.description ?? transaction_details.description,
            localDetailChanges.value ?? transaction_details.value,
            localDetailChanges.currency_symbol ?? transaction_details.currency_symbol,
            localDetailChanges.currency_conversion_rate ?? transaction_details.currency_conversion_rate,
            localDetailChanges.billed_at ?? transaction_details.billed_at,
            localDetailChanges.creditor_shares ?? transaction_details.creditor_shares,
            localDetailChanges.debitor_shares ?? transaction_details.debitor_shares,
            localDetailChanges.deleted ?? transaction_details.deleted,
            has_committed_changes,
            all_positions,
            files,
            transaction_details.committed_at
        );
    }
}

export const groupTransactions = atomFamily<Array<TransactionBackend>, number>({
    key: "groupTransactions",
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

            // TODO: handle fetch error more properly than just showing error, e.g. through a retry or something
            setSelf(fullFetchPromise());

            const fetchAndUpdateTransaction = (
                currTransactions: Array<TransactionBackend>,
                transactionID: number,
                isNew: boolean
            ) => {
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

export const addTransactionInState = (
    transaction: TransactionBackend,
    setTransactions: SetterOrUpdater<Array<TransactionBackend>>
) => {
    setTransactions((currTransactions: Array<TransactionBackend>) => {
        return [...currTransactions, transaction];
    });
};

export const updateTransactionInState = (
    transaction: TransactionBackend,
    setTransactions: SetterOrUpdater<Array<TransactionBackend>>
) => {
    setTransactions((currTransactions: Array<TransactionBackend>) => {
        return currTransactions.map((t) => (t.id === transaction.id ? transaction : t));
    });
};

export interface LocalTransactionDetailChanges {
    description?: string;
    value?: number;
    currency_symbol?: string;
    currency_conversion_rate?: number;
    creditor_shares?: CreditorShares;
    debitor_shares?: DebitorShares;
    billed_at?: string;
    deleted?: boolean;
}

export interface LocalPositionChange {
    id: number;
    name: string;
    price: number;
    communist_shares: number;
    usages: PositionUsages;
    deleted: boolean;
}

export interface LocalPositionChanges {
    modified: { [k: number]: LocalPositionChange };
    added: { [k: number]: LocalPositionChange };
    empty: LocalPositionChange;
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
            communist_shares: 0,
            usages: {},
            deleted: false,
        },
    },
    effects_UNSTABLE: (transactionID) => [localStorageEffect(`localTransactionPositionChanges-${transactionID}`)],
});

export const transactionsSeenByUser = selectorFamily<Array<Transaction>, number>({
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
                    return Transaction.fromBackendFormat(transaction, localDetailChanges, localPositionChanges);
                })
                .sort(transactionCompareFn);
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

export interface AccountBalance {
    balance: number;
    beforeClearing: number;
    totalConsumed: number;
    totalPaid: number;
    clearingResolution: any; //TODO: figure out
}

export const accountBalances = selectorFamily<{ [k: number]: AccountBalance }, number>({
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
                        beforeClearing: 0,
                        totalConsumed: 0,
                        totalPaid: 0,
                        clearingResolution: {},
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
                    accountBalances[accountID].balance += value.total;
                    accountBalances[accountID].beforeClearing = accountBalances[accountID].balance;
                });
            }

            // linearize the account dependency graph to properly redistribute clearing accounts
            const shareMap: Map<number, ClearingShares> = accounts.reduce((map, acc) => {
                if (acc.clearing_shares != null && Object.keys(acc.clearing_shares).length) {
                    map.set(acc.id, acc.clearing_shares);
                }
                return map;
            }, new Map<number, ClearingShares>());
            let clearingDependencies: { [k: number]: Set<number> } = {};
            let inDegree = accounts.reduce((map: { [k: number]: number }, curr) => {
                map[curr.id] = 0;
                return map;
            }, {});
            shareMap.forEach((shares: ClearingShares, accountID: number) => {
                // TODO: maybe functionalize
                for (const nextAccountID of Object.keys(shares)) {
                    if (shareMap.hasOwnProperty(nextAccountID)) {
                        inDegree[parseInt(nextAccountID)] += 1;
                    }
                    if (clearingDependencies.hasOwnProperty(nextAccountID)) {
                        clearingDependencies[parseInt(nextAccountID)].add(accountID);
                    } else {
                        clearingDependencies[parseInt(nextAccountID)] = new Set<number>([accountID]);
                    }
                }
            });
            let zeroDegreeAccounts: Array<number> = [...shareMap.keys()].filter(
                (accountID) => inDegree[accountID] === 0
            );
            let sorting = [];

            while (zeroDegreeAccounts.length > 0) {
                const node = zeroDegreeAccounts.pop();
                if (node === undefined) {
                    throw new Error("error computing transaction balances");
                }
                const shares = shareMap.get(node);
                if (shares !== undefined) {
                    sorting.push(node);
                    for (const nextAccount of Object.keys(shares)) {
                        inDegree[parseInt(nextAccount)] -= 1;
                        if (inDegree[parseInt(nextAccount)] <= 0) {
                            zeroDegreeAccounts.push(parseInt(nextAccount));
                        }
                    }
                }
            }

            for (const clearing of sorting) {
                const clearingShares = shareMap.get(clearing);
                if (clearingShares === undefined || Object.keys(clearingShares).length === 0) {
                    continue;
                }

                const toSplit = accountBalances[clearing].balance;
                accountBalances[clearing].balance = 0;
                const totalShares = Object.values(clearingShares).reduce((acc: number, curr: number) => curr + acc, 0);
                for (const acc in clearingShares) {
                    const accShare = (toSplit * clearingShares[acc]) / totalShares;
                    if (accountBalances[clearing].clearingResolution.hasOwnProperty(acc)) {
                        accountBalances[clearing].clearingResolution[acc] += accShare;
                    } else {
                        accountBalances[clearing].clearingResolution[acc] = accShare;
                    }
                    accountBalances[acc].balance += accShare;
                    if (accShare > 0) {
                        accountBalances[acc].totalPaid += Math.abs(accShare);
                    } else {
                        accountBalances[acc].totalConsumed += Math.abs(accShare);
                    }
                }
            }

            return accountBalances;
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
            return get(transactionsSeenByUser(groupID)).filter((transaction) =>
                transaction.account_balances.hasOwnProperty(accountID)
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

            let balanceChanges = [];
            for (const transaction of transactions) {
                const a = transaction.account_balances[accountID];
                balanceChanges.push({
                    date: transaction.last_changed.toSeconds(),
                    change: a.total,
                    changeOrigin: {
                        type: "transaction",
                        id: transaction.id,
                    },
                });
            }

            for (const account of clearingAccounts) {
                if (balances[account.id].clearingResolution.hasOwnProperty(accountID)) {
                    balanceChanges.push({
                        date: account.last_changed.toSeconds(),
                        change: balances[account.id].clearingResolution[accountID],
                        changeOrigin: {
                            type: "clearing",
                            id: account.id,
                        },
                    });
                }
            }
            balanceChanges.sort((a1, a2) => a1.date - a2.date);

            let accumulatedBalanceChanges: Array<BalanceHistoryEntry> = [];
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
