import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { SubscriptionSliceState, Subscription, IRootState } from "../types";
import { AbrechnungWebSocket } from "@abrechnung/api";

export const subscribe = createAsyncThunk<
    Subscription,
    { subscription: Subscription; websocket: AbrechnungWebSocket },
    { state: IRootState }
>(
    "subscribe",
    async ({ subscription, websocket }) => {
        await websocket.waitUntilAuthenticated();
        websocket.sendSubscriptionRequest(
            subscription.type,
            subscription.type === "group" ? subscription.userId : subscription.groupId
        );
        return subscription;
    },
    {
        condition: ({ subscription }, { getState }) => {
            const state = getState().subscriptions;
            if (state.subscriptions.find((s) => JSON.stringify(s) === JSON.stringify(subscription))) {
                return false;
            }
            return true;
        },
    }
);

export const unsubscribe = createAsyncThunk<
    Subscription,
    { subscription: Subscription; websocket: AbrechnungWebSocket },
    { state: IRootState }
>(
    "unsubscribe",
    async ({ subscription, websocket }) => {
        websocket.sendUnsubscriptionRequest(
            subscription.type,
            subscription.type === "group" ? subscription.userId : subscription.groupId
        );
        return subscription;
    },
    {
        condition: ({ subscription }, { getState }) => {
            const state = getState().subscriptions;
            if (state.subscriptions.find((s) => JSON.stringify(s) === JSON.stringify(subscription))) {
                return true;
            }
            return false;
        },
    }
);

const initialState: SubscriptionSliceState = {
    subscriptions: [],
    activeInstanceId: 0,
};

const subscriptionSlice = createSlice({
    name: "subscription",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(subscribe.fulfilled, (state, action) => {
            const subscription = action.payload;
            state.subscriptions.push(subscription);
        });
        builder.addCase(unsubscribe.fulfilled, (state, action) => {
            const subscription = action.payload;
            const idx = state.subscriptions.findIndex(
                (s: Subscription) => JSON.stringify(s) === JSON.stringify(subscription)
            );
            if (idx >= 0) {
                state.subscriptions.splice(idx, 1);
            }
        });
    },
});

//export const {} = subscriptionSlice.actions;

export const { reducer: subscriptionReducer } = subscriptionSlice;
