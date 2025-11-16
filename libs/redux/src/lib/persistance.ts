import { combineReducers } from "@reduxjs/toolkit";
import { Action, UnknownAction, ReducersMapObject } from "redux";
import { MigrationManifest, createMigrate, persistReducer, type Storage } from "redux-persist";
import { accountMigrations, accountReducer, accountSliceVersion } from "./accounts";
import { authMigrations, authReducer, authSliceVersion } from "./auth";
import { groupMigrations, groupReducer, groupSliceVersion } from "./groups";
import { transactionMigrations, transactionReducer, transactionSliceVersion } from "./transactions";

const getPersistConfig = (key: string, version: number, storage: Storage, migrations: MigrationManifest) => {
    return {
        key: key,
        version: version,
        storage,
        migrate: createMigrate(migrations),
    };
};

export const getAbrechnungReducer = <S, A extends Action = UnknownAction>(
    persistStorage: Storage,
    additionalReducers: ReducersMapObject<S, A>
) => {
    return combineReducers({
        accounts: persistReducer(
            getPersistConfig("accounts", accountSliceVersion, persistStorage, accountMigrations as any),
            accountReducer
        ),
        groups: persistReducer(
            getPersistConfig("groups", groupSliceVersion, persistStorage, groupMigrations as any),
            groupReducer
        ),
        transactions: persistReducer(
            getPersistConfig("transactions", transactionSliceVersion, persistStorage, transactionMigrations as any),
            transactionReducer
        ),
        auth: persistReducer(
            getPersistConfig("auth", authSliceVersion, persistStorage, authMigrations as any),
            authReducer
        ),
        ...additionalReducers,
    });
};
