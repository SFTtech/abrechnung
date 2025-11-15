import { AccountSliceState } from "../types";

export const accountSliceVersion = 3;

export const accountMigrations = {
    1: (state: AccountSliceState) => {
        return {};
    },
    2: (state: AccountSliceState) => {
        return {};
    },
};
