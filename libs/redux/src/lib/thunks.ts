import { createAsyncThunk } from "@reduxjs/toolkit";
import { PURGE } from "redux-persist";
import { Api } from "@abrechnung/api";
import { fetchAccounts } from "./accounts";
import { fetchTransactions } from "./transactions";
import { IRootState } from "./types";

export const fetchGroupDependencies = createAsyncThunk<
    void,
    { groupId: number; api: Api; fetchAnyway?: boolean },
    { state: IRootState }
>(
    "fetchGroupDependencies",
    async ({ groupId, api, fetchAnyway = false }, { dispatch }) => {
        await Promise.all([
            dispatch(fetchAccounts({ groupId, api, fetchAnyway })).unwrap(),
            dispatch(fetchTransactions({ groupId, api, fetchAnyway })).unwrap(),
        ]);
    },
    {
        condition: async ({ api }): Promise<boolean> => {
            return await api.hasConnection();
        },
    }
);

export const clearCache = createAsyncThunk<void, void>("clearCache", async (args, { dispatch }) => {
    dispatch({
        type: PURGE,
        result: () => {
            return;
        },
    });
});
