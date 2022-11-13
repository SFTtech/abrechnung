import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { accountReducer, authReducer, groupReducer, transactionReducer, subscriptionReducer } from "@abrechnung/redux";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { settingsReducer } from "./settingsSlice";

const persistConfig = {
    key: "root",
    version: 1,
    // blacklist: ["subscriptions", "accounts", "groups", "transactions"],
    blacklist: ["subscriptions"],
    storage,
};

const rootReducer = combineReducers({
    accounts: accountReducer,
    groups: groupReducer,
    transactions: transactionReducer,
    auth: authReducer,
    settings: settingsReducer,
    subscriptions: subscriptionReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }),
});
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
