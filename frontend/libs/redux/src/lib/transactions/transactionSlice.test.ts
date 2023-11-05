import { configureStore } from "@reduxjs/toolkit";
import { TransactionSliceState } from "../types";

import {
    createTransaction,
    initializeGroupState,
    selectTransactionById,
    selectTransactionPositions,
    transactionReducer,
    wipPositionAdded,
    wipPositionUpdated,
    wipTransactionUpdated,
} from "./transactionSlice";

const setupStore = () => {
    const state: TransactionSliceState = {
        byGroupId: {},
        nextLocalPositionId: -1,
        nextLocalTransactionId: -1,
        activeInstanceId: 0,
    };
    initializeGroupState(state, 1);
    return configureStore({
        reducer: {
            transactions: transactionReducer,
        },
        preloadedState: { transactions: state },
    });
};

describe("transactionSlice", () => {
    it("creating purchases works", async () => {
        const store = setupStore();
        const { transaction } = await store.dispatch(createTransaction({ groupId: 1, type: "purchase" })).unwrap();
        expect(transaction.name).toBe("");
        expect(transaction.isWip).toBe(true);
        expect(transaction.hasLocalChanges).toBe(true);

        // change it
        {
            store.dispatch(
                wipTransactionUpdated({
                    ...transaction,
                    name: "funny things",
                    value: 10,
                    debitor_shares: { 1: 1 },
                    creditor_shares: { 2: 1 },
                })
            );
            const t = selectTransactionById({
                state: store.getState().transactions,
                groupId: 1,
                transactionId: transaction.id,
            });
            expect(t).not.toBeUndefined();
            if (!t) {
                throw new Error();
            }
            expect(t.id).toBe(transaction.id);
            expect(t.name).toBe("funny things");
            expect(t.value).toBe(10);
        }
        // add a position
        let positionId: number;
        {
            store.dispatch(
                wipPositionAdded({
                    groupId: 1,
                    transactionId: transaction.id,
                    position: {
                        name: "",
                        price: 0,
                        communist_shares: 0,
                        usages: {},
                    },
                })
            );
            const positions = selectTransactionPositions({
                state: store.getState().transactions,
                groupId: 1,
                transactionId: transaction.id,
            });
            expect(positions).toHaveLength(1);
            expect(positions[0].name).toBe("");
            positionId = positions[0].id;
        }

        // change the position
        {
            store.dispatch(
                wipPositionUpdated({
                    groupId: 1,
                    transactionId: transaction.id,
                    position: {
                        id: positionId,
                        name: "Pizza",
                        transactionID: transaction.id,
                        price: 10,
                        communist_shares: 2,
                        usages: { 1: 1 },
                        deleted: false,
                    },
                })
            );
            const positions = selectTransactionPositions({
                state: store.getState().transactions,
                groupId: 1,
                transactionId: transaction.id,
            });
            expect(positions).toHaveLength(1);
            expect(positions[0].name).toBe("Pizza");
            expect(positions[0].price).toBe(10);
            expect(positions[0].communist_shares).toBe(2);
        }
    });

    it("creating transfers works", () => {
        const store = setupStore();
        // const res = await store.dispatch(createTransfer({ groupId: 1 }));
    });
});
