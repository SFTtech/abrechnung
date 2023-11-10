import { TransactionSliceState } from "../types";

export const transactionSliceVersion = 3;

export const transactionMigrations = {
    1: (state: TransactionSliceState) => {
        return {};
    },
    2: (state: TransactionSliceState) => {
        return {};
    },
};
