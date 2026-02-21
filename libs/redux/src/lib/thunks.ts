import { PURGE } from "redux-persist";
import { Api } from "@abrechnung/api";
import { fetchAccounts, setAccountStatus } from "./accounts";
import { fetchTransactions, setTransactionStatus } from "./transactions";
import { IRootState } from "./types";
import { createAsyncThunkWithErrorHandling } from "./utils";

export const fetchGroupDependencies = createAsyncThunkWithErrorHandling<
    void,
    { groupId: number; api: Api; fetchAnyway?: boolean },
    { state: IRootState }
>(
    "fetchGroupDependencies",
    async ({ groupId, api, fetchAnyway = false }, { dispatch }) => {
        dispatch(setTransactionStatus({ groupId, status: "loading" }));
        dispatch(setAccountStatus({ groupId, status: "loading" }));
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

export const clearCache = createAsyncThunkWithErrorHandling<void, void>("clearCache", async (args, { dispatch }) => {
    dispatch({
        type: PURGE,
        result: () => {
            return;
        },
    });
});
