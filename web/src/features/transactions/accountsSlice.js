import {createAsyncThunk, createEntityAdapter, createSlice} from "@reduxjs/toolkit";
import {ws} from "../../websocket";
import {createGroup, deleteGroup} from "../groups/groupsSlice";

export const fetchAccounts = createAsyncThunk("transactions/fetchAccounts", async ({groupID}, {getState}) => {
    return ws.call("account_list", {
        authtoken: getState().auth.sessionToken,
        group_id: groupID,
    });
});

export const createAccount = createAsyncThunk("transactions/createAccount", async ({groupID, name, description}, {getState}) => {
    return ws.call("account_create", {
        authtoken: getState().auth.sessionToken,
        group_id: groupID,
        name: name,
        description: description,
    });
});

const accountsAdapter = createEntityAdapter({
    // Sort accounts by name
    sortComparer: (a, b) => a.name.localeCompare(b.name),
});

export const accountsSlice = createSlice({
    name: "transactions",
    initialState: accountsAdapter.getInitialState({
        status: "loading", // or loading | failed
        error: null,
    }),
    extraReducers: {
        [fetchAccounts.fulfilled]: (state, action) => {
            // TODO: more sophisticated merging of account data to not overwrite existing member info
            // alternatively force a full reload (which might lead to more consistency)
            accountsAdapter.upsertMany(state, action.payload);
            state.status = "idle";
            state.error = null;
        },
        [fetchAccounts.pending]: (state, action) => {
            state.status = "loading";
        },
        [fetchAccounts.rejected]: (state, action) => {
            state.error = action.error.message;
            state.status = "failed";
        },
        [createAccount.fulfilled]: (state, action) => {
            let account = {
                id: action.payload[0].id,
                name: action.meta.arg.name,
                description: action.meta.arg.description,
            };
            accountsAdapter.addOne(state, account);
            state.status = "idle";
            state.error = null;
        },
        [createAccount.rejected]: (state, action) => {
            state.error = action.error.message;
        },
    }
});

export default accountsSlice.reducer;
