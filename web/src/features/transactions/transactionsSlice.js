import {createAsyncThunk, createEntityAdapter, createSlice} from "@reduxjs/toolkit";
import {ws} from "../../websocket";

export const fetchTransactions = createAsyncThunk("transactions/fetchTransactions", async ({groupID}, {getState}) => {
    return ws.call("transaction_list", {
        authtoken: getState().auth.sessionToken,
        group_id: groupID,
    });
});


const transactionAdapter = createEntityAdapter({
    // Sort transactions by timestamp
    sortComparer: (a, b) => a.timestamp < b.timestamp,
});


export const transactionsSlice = createSlice({
    name: "transactions",
    initialState: transactionAdapter.getInitialState({
        status: "loading", // or loading | failed
        error: null,
    }),
    extraReducers: {
    }
});

export default transactionsSlice.reducer;
