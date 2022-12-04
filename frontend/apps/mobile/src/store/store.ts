import { combineReducers, configureStore } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import { persistStore, persistReducer } from "redux-persist";
import { accountReducer, authReducer, groupReducer, subscriptionReducer, transactionReducer } from "@abrechnung/redux";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { settingsReducer } from "./settingsSlice";
import { uiReducer } from "./uiSlice";

const persistConfig = {
    key: "root",
    version: 1,
    // blacklist: ["subscriptions", "auth", "accounts", "groups", "transactions"],
    blacklist: ["subscriptions"],
    storage: AsyncStorage,
};

const rootReducer = combineReducers({
    accounts: accountReducer,
    groups: groupReducer,
    transactions: transactionReducer,
    auth: authReducer,
    settings: settingsReducer,
    subscriptions: subscriptionReducer,
    ui: uiReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: [thunk],
});
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
