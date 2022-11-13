import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import memoize from "proxy-memoize";
import { Api } from "@abrechnung/api";
import { RootState } from "./store";
import { fetchAccounts, fetchGroupMembers, fetchTransactions } from "@abrechnung/redux";

export interface UiSliceState {
    activeGroupId: number | undefined;
}

const initialState: UiSliceState = {
    activeGroupId: undefined,
};

// selectors
export const selectActiveGroupId = memoize((args: { state: UiSliceState }): number | undefined => {
    const { state } = args;
    return state.activeGroupId;
});

export const changeActiveGroup = createAsyncThunk<
    { groupId: number },
    { groupId: number; api: Api },
    { state: RootState }
>("changeActiveGroup", async ({ groupId, api }, { getState, dispatch }) => {
    const state = getState();

    const needsToFetch =
        state.accounts.byGroupId[groupId] === undefined ||
        state.transactions.byGroupId[groupId] === undefined ||
        state.groups.byGroupId[groupId] === undefined;

    if (await api.hasConnection()) {
        await Promise.all([
            dispatch(fetchAccounts({ groupId, api })),
            dispatch(fetchTransactions({ groupId, api })),
            dispatch(fetchGroupMembers({ groupId, api })),
        ]);
    } else if (needsToFetch) {
        throw new Error("no connection");
    }

    return { groupId };
});

export const fetchGroupDependencies = createAsyncThunk<void, { groupId: number; api: Api }, { state: RootState }>(
    "fetchGroupDependencies",
    async ({ groupId, api }, { dispatch }) => {
        if (await api.hasConnection()) {
            await Promise.all([
                dispatch(fetchAccounts({ groupId, api })),
                dispatch(fetchTransactions({ groupId, api })),
                dispatch(fetchGroupMembers({ groupId, api })),
            ]);
        }
    }
);

const uiSlice = createSlice({
    name: "ui",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(changeActiveGroup.fulfilled, (state, action) => {
            const { groupId } = action.payload;
            state.activeGroupId = groupId;
        });
    },
});

//export const { } = uiSlice.actions;

export const { reducer: uiReducer } = uiSlice;
