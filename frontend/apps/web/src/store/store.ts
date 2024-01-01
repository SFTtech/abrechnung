import { configureStore } from "@reduxjs/toolkit";
import { persistStore } from "redux-persist";
import { getAbrechnungReducer } from "@abrechnung/redux";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { settingsReducer } from "./settingsSlice";
import localForage from "localforage";

/**
 * Persist you redux state using IndexedDB
 * @param {string} dbName - IndexedDB database name
 */
const storage = (dbName: string) => {
    const db = localForage.createInstance({
        name: dbName,
    });
    return {
        db,
        getItem: db.getItem,
        setItem: db.setItem,
        removeItem: db.removeItem,
    };
};

const rootReducer = getAbrechnungReducer(storage("abrechnung"), { settings: settingsReducer });

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
            immutableCheck: false,
        }),
});
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
