import { atomFamily, selectorFamily, useRecoilValue } from "recoil";
import { Transaction, TransactionPosition } from "@abrechnung/types";
import {
    getTransaction,
    getTransactions,
    getTransactionsPositions,
    getTransactionsPositionsForGroup,
    transactionNotifier,
    transactionPositionNotifier,
} from "./database/transactions";
import { useNavigation } from "@react-navigation/native";

function filterTransactions(transactions: Transaction[]): Transaction[] {
    return transactions.filter((t) => !t.deleted);
}

export const transactionState = atomFamily<Transaction[], number>({
    key: "transactionState",
    default: (groupID) => (groupID === null ? [] : (async () => filterTransactions(await getTransactions(groupID)))()),
    effects: (groupID) => [
        ({ setSelf }) => {
            return transactionNotifier.on("changed", (payload) => {
                if (payload.groupID !== groupID) {
                    return;
                }

                if (payload.transactionID === undefined) {
                    getTransactions(groupID).then((result) => {
                        console.log("received transaction update:", groupID);
                        setSelf(filterTransactions(result));
                    });
                } else {
                    getTransaction(groupID, payload.transactionID).then((transaction) => {
                        console.log("received transaction update:", groupID);
                        setSelf((currVal) => {
                            return (currVal as Transaction[]).map((t) => (t.id === transaction.id ? transaction : t));
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

export const transactionByIDState = selectorFamily<Transaction | undefined, transactionIdentifierParam>({
    key: "transactionByIDState",
    get:
        ({ groupID, transactionID }) =>
        ({ get }) => {
            const transactions = get(transactionState(groupID));
            return transactions.find((t) => t.id === transactionID);
        },
});

export const useTransaction = (groupID: number, transactionID: number): Transaction => {
    const transaction = useRecoilValue(transactionByIDState({ groupID, transactionID }));
    const navigation = useNavigation();
    if (transaction == null) {
        navigation.navigate("TransactionList", { groupID: groupID });
        throw new Error("transaction was null unexpectedly");
    }
    return transaction;
};

function filterPositions(positions: TransactionPosition[]): TransactionPosition[] {
    return positions.filter((t) => !t.deleted);
}

export const positionState = atomFamily<TransactionPosition[], number>({
    key: "positionState",
    default: (groupID) => (groupID === null ? [] : (async () => await getTransactionsPositionsForGroup(groupID))()),
    effects: (groupID) => [
        ({ setSelf }) => {
            return transactionNotifier.on("changed", (payload) => {
                if (payload.groupID !== groupID) {
                    return;
                }

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
            return transactionPositionNotifier.on("changed", (payload) => {
                if (payload.transactionID !== transactionID) {
                    return;
                }

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
                positions.filter((p) => p.usages[accountID] !== undefined).map((p) => p.transactionID)
            );

            return transactions.filter(
                (t) =>
                    t.debitorShares[accountID] !== undefined ||
                    t.creditorShares[accountID] !== undefined ||
                    involvedTransactionIDsThroughPositions.has(t.id)
            );
        },
});
