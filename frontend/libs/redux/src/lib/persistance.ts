import { Action, AnyAction, ReducersMapObject } from "redux";
import { combineReducers } from "@reduxjs/toolkit";
import { persistReducer, createMigrate, type Storage, MigrationManifest } from "redux-persist";
import { accountReducer, accountMigrations, accountSliceVersion } from "./accounts";
import { transactionReducer, transactionMigrations, transactionSliceVersion } from "./transactions";
import { authReducer, authMigrations, authSliceVersion } from "./auth";
import { groupReducer, groupMigrations, groupSliceVersion } from "./groups";
import { subscriptionReducer } from "./subscriptions";

const getPersistConfig = (key: string, version: number, storage: Storage, migrations: MigrationManifest) => {
    return {
        key: key,
        version: version,
        storage,
        migrate: createMigrate(migrations),
    };
};

export const getAbrechnungReducer = <S, A extends Action = AnyAction>(
    persistStorage: Storage,
    additionalReducers: ReducersMapObject<S, A>
) => {
    return combineReducers({
        accounts: persistReducer(
            getPersistConfig("accounts", accountSliceVersion, persistStorage, accountMigrations),
            accountReducer
        ),
        groups: persistReducer(
            getPersistConfig("groups", groupSliceVersion, persistStorage, groupMigrations),
            groupReducer
        ),
        transactions: persistReducer(
            getPersistConfig("transactions", transactionSliceVersion, persistStorage, transactionMigrations),
            transactionReducer
        ),
        auth: persistReducer(getPersistConfig("auth", authSliceVersion, persistStorage, authMigrations), authReducer),
        subscriptions: subscriptionReducer,
        ...additionalReducers,
    });
};
