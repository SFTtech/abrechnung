import * as SQLite from "expo-sqlite";
import migrations from "./migrations";
import { Database } from "./async_wrapper";

function openDatabase() {
    // if (Platform.OS === "web") {
    //   return {
    //     transaction: () => {
    //       return {
    //         executeSql: () => {},
    //       };
    //     },
    //   };
    // }

    return SQLite.openDatabase("abrechnung.db");
}

const successCallback = () => console.log("database call was successful");
const errorCallback = (error) => console.log("database call threw an error:", error);

export async function dropTables(connection) {
    const tables = [
        "pending_transaction_position_changes",
        "transaction_position",
        "pending_transaction_changes",
        '"transaction"',
        "group_member",
        "pending_account_changes",
        "account",
        "grp",
        "abrechnung_instance",
        migrationsTable,
    ];
    for (const table of tables) {
        await connection.execute(`drop table if exists ${table}`);
    }
}

export async function flushDatabase() {
    const tables = [
        "pending_transaction_position_changes",
        "transaction_position",
        "pending_transaction_changes",
        '"transaction"',
        "group_member",
        "pending_account_changes",
        "account",
        "grp",
    ];
    await db.transaction(async (conn) => {
        for (const table of tables) {
            await conn.execute(`delete
                                from
                                    ${table}
                                where
                                    true`);
        }
    });
}

// When adding new migrations in already deployed app, append them to the end of array, do not re-arrange
// Do not modify migration after app version containing it is published
const migrationsTable = "_migrations";

export const db = new Database("main", {
    prepareConnFn: async (connection) => {
        try {
            await connection.execute("PRAGMA foreign_keys = ON;");
            // await connection.execute("PRAGMA journal_mode = WAL;") // apparently does not work
        } catch (e) {
            console.log(e);
        }
    },
    migrateFn: async (connection) => {
        // Inside migration function you can use `connection.beginTransaction`, `connection.commitTransaction` and
        // `connection.rollbackTransaction` methods to control transactions, as needed. In this example I simply
        // run all migrations inside single transaction. Your needs might be different
        // Outside of migration use `transaction` method of `Database` class for transactions
        await connection.beginTransaction();
        // await dropTables(connection);
        try {
            await connection.execute(
                `create table if not exists ${migrationsTable} (
                    version   integer primary key,
                    updatedAt text not null
                )`
            );
            const versions = (
                await connection.execute(`select *
                                          from
                                              ${migrationsTable}`)
            ).rows.map(({ version }) => version);
            const currentVersion = Math.max(0, ...versions);

            console.log("Current Migration Version:", currentVersion);
            for (let i = currentVersion + 1; i < migrations.length; i++) {
                for (const statement of migrations[i]) {
                    await connection.execute(statement);
                }
                await connection.execute(
                    `insert into ${migrationsTable}
                                          values (
                                              ?, ?
                                          )`,
                    [i, new Date().toISOString()]
                );
                console.log(`Applied migration ${i}`);
            }
            await connection.commitTransaction();
        } catch (e) {
            await connection.rollbackTransaction();
            console.log(e);
        }
    },
});
