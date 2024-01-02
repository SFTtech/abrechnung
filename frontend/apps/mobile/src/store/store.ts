import { getAbrechnungReducer } from "@abrechnung/redux";
import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { persistStore } from "redux-persist";
import { settingsReducer } from "./settingsSlice";
import { uiReducer } from "./uiSlice";
// import FilesystemStorage from "redux-persist-filesystem-storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// const rootReducer = getAbrechnungReducer(FilesystemStorage, { settings: settingsReducer, ui: uiReducer });
const rootReducer = getAbrechnungReducer(AsyncStorage, { settings: settingsReducer, ui: uiReducer });

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
