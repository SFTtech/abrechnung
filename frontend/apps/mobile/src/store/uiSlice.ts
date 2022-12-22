import { Api } from "@abrechnung/api";
import { fetchGroupDependencies } from "@abrechnung/redux";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import memoize from "proxy-memoize";
import { notify } from "../notifications";
import { RootState } from "./store";

export interface GlobalInfo {
    text: string;
    category: "info" | "warning" | "error";
}

export interface UiSliceState {
    activeGroupId: number | undefined;
    globalInfo?: GlobalInfo | undefined;
}

const initialState: UiSliceState = {
    activeGroupId: undefined,
};

// selectors
export const selectActiveGroupId = memoize((args: { state: UiSliceState }): number | undefined => {
    const { state } = args;
    return state.activeGroupId;
});

export const selectGlobalInfo = (args: { state: UiSliceState }): GlobalInfo | undefined => {
    const { state } = args;
    return state.globalInfo;
};

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

    try {
        await dispatch(fetchGroupDependencies({ groupId, api, fetchAnyway: true })).unwrap();
    } catch {
        if (needsToFetch) {
            notify({ text: "Error changing active group. Could not fetch group content." });
            throw new Error("no connection");
        }
    }

    return { groupId };
});

const uiSlice = createSlice({
    name: "ui",
    initialState,
    reducers: {
        setGlobalInfo: (state, action: PayloadAction<GlobalInfo | undefined>) => {
            state.globalInfo = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(changeActiveGroup.fulfilled, (state, action) => {
            const { groupId } = action.payload;
            state.activeGroupId = groupId;
        });
    },
});

export const { setGlobalInfo } = uiSlice.actions;

export const { reducer: uiReducer } = uiSlice;
