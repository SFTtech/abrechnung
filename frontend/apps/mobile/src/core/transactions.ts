import { atomFamily, selectorFamily } from "recoil";
import { Transaction, TransactionPosition } from "@abrechnung/types";
import {
    getTransaction,
    getTransactions,
    getTransactionsPositions,
    getTransactionsPositionsForGroup,
    transactionNotifier,
    transactionPositionNotifier,
} from "./database/transactions";

function filterTransactions(transactions: Transaction[]): Transaction[] {
    return transactions.filter((t) => !t.deleted);
}

export const transactionState = atomFamily<Transaction[], number>({
    key: "transactionState",
    default: (groupID) => (groupID === null ? [] : (async () => filterTransactions(await getTransactions(groupID)))()),
    effects: (groupID) => [
        ({ setSelf }) => {
            return transactionNotifier.subscribe(groupID, (payload) => {
                if (payload.transaction_id === undefined) {
                    getTransactions(groupID).then((result) => {
                        console.log("received transaction update:", groupID);
                        setSelf(filterTransactions(result));
                    });
                } else {
                    getTransaction(groupID, payload.transaction_id).then((transaction) => {
                        console.log("received transaction update:", groupID);
                        setSelf((currVal) => {
                            return (<Transaction[]>currVal).map((t) => (t.id === transaction.id ? transaction : t));
                        });
                    });
                }
            });
        },
    ],
});

type transactionIdentifierParam = {
    groupID: number;
    transactionID: number;
};

export const transactionByIDState = selectorFamily<Transaction, transactionIdentifierParam>({
    key: "transactionByIDState",
    get:
        ({ groupID, transactionID }) =>
        ({ get }) => {
            const transactions = get(transactionState(groupID));
            return transactions.find((t) => t.id === transactionID);
        },
});

function filterPositions(positions: TransactionPosition[]): TransactionPosition[] {
    return positions.filter((t) => !t.deleted);
}

export const positionState = atomFamily<TransactionPosition[], number>({
    key: "positionState",
    default: (groupID) => (groupID === null ? [] : (async () => await getTransactionsPositionsForGroup(groupID))()),
    effects: (groupID) => [
        ({ setSelf }) => {
            return transactionNotifier.subscribe(groupID, (payload) => {
                getTransactionsPositionsForGroup(groupID).then((result) => {
                    console.log("received transaction position update:", groupID);
                    setSelf(result);
                });
            });
        },
    ],
});

export const positionStateByTransaction = atomFamily<TransactionPosition[], number>({
    key: "positionStateByTransaction",
    default: (transactionID) =>
        transactionID === null ? [] : (async () => filterPositions(await getTransactionsPositions(transactionID)))(),
    effects: (transactionID) => [
        ({ setSelf }) => {
            return transactionPositionNotifier.subscribe(transactionID, (payload) => {
                getTransactionsPositions(transactionID).then((result) => {
                    console.log("received transaction position update:", transactionID);
                    setSelf(filterPositions(result));
                });
            });
        },
    ],
});

type accountIdentifierParam = {
    groupID: number;
    accountID: number;
};

export const transactionsInvolvingAccount = selectorFamily<Transaction[], accountIdentifierParam>({
    key: "transactionsInvolvingAccount",
    get:
        ({ groupID, accountID }) =>
        ({ get }) => {
            if (groupID == null || accountID == null) {
                return [];
            }
            const transactions = get(transactionState(groupID));
            const positions = get(positionState(groupID));
            const involvedTransactionIDsThroughPositions = new Set<number>(
                positions.filter((p) => p.usages.hasOwnProperty(accountID)).map((p) => p.transaction_id)
            );

            return transactions.filter(
                (t) =>
                    t.debitor_shares.hasOwnProperty(accountID) ||
                    t.creditor_shares.hasOwnProperty(accountID) ||
                    involvedTransactionIDsThroughPositions.has(t.id)
            );
        },
});
