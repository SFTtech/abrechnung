import * as SQLite from "expo-sqlite";
import { ResultSet, ResultSetError, WebSQLDatabase } from "expo-sqlite";
import migrations from "./migrations";

type SQLType = string | number | Date | boolean | null;

export interface SQLQuery {
    sql: string;
    args: SQLType[];
}

export class Connection {
    private _db: WebSQLDatabase;
    private transacting: boolean;

    constructor(databaseName: string) {
        this._db = SQLite.openDatabase(databaseName);
        this.transacting = false;
    }

    public execute = async (sqlStatement: string, args: SQLType[] = []) => {
        return new Promise<ResultSet>((resolve, reject) => {
            this._db.exec([{ sql: sqlStatement, args }], false, (err, res) => {
                if (err || !res) {
                    console.log("sql exec error in", sqlStatement, "\nerror:", err);
                    return reject(err);
                }

                if (res && res[0].hasOwnProperty("error")) {
                    console.log(sqlStatement, (res[0] as ResultSetError).error);
                    return reject((res[0] as ResultSetError).error);
                }

                resolve(res[0] as ResultSet);
            });
        });
    };

    public executeMany = async (queries: SQLQuery[]) => {
        return new Promise<void>((resolve, reject) => {
            this._db.exec(queries, false, (err, res) => {
                if (err || !res) {
                    console.log("sql exec error in", queries, "\nerror:", err);
                    return reject(err);
                }

                if (res && res[0].hasOwnProperty("error")) {
                    console.log(queries, (res[0] as ResultSetError).error);
                    return reject((res[0] as ResultSetError).error);
                }

                resolve();
            });
        });
    };

    public close = async () => {
        await this._db.closeAsync();
    };

    public beginTransaction = async () => {
        await this.execute("begin transaction");
        this.transacting = true;
    };

    public commitTransaction = async () => {
        await this.execute("commit");
        this.transacting = false;
    };

    public rollbackTransaction = async () => {
        await this.execute("rollback");
        this.transacting = false;
    };
}

type PrepareConnFunction = (conn: Connection) => void;
type MigrateFunction = (conn: Connection) => void;

export class Database {
    private _connection: Connection;
    private _dbName: string;
    private _params: { prepareConnFn?: PrepareConnFunction; migrateFn?: MigrateFunction };
    private _prepareConnectionPromise: any;
    private _migrationPromise: Promise<void>;

    constructor(
        name = "main",
        { prepareConnFn, migrateFn }: { prepareConnFn?: PrepareConnFunction; migrateFn?: MigrateFunction } = {}
    ) {
        this._dbName = name;
        this._connection = new Connection(this._dbName);
        this._params = { prepareConnFn, migrateFn };

        this._prepareConnectionPromise =
            typeof this._params.prepareConnFn === "function"
                ? this._params.prepareConnFn(this._connection)
                : Promise.resolve();

        const performMigration = async () => {
            const connection = new Connection(this._dbName);
            if (this._params.migrateFn) {
                await this._params.migrateFn(connection);
            }
            connection.close();
        };

        this._migrationPromise = typeof this._params.migrateFn === "function" ? performMigration() : Promise.resolve();
    }

    public connection = (): Connection => {
        return this._connection;
    };

    public execute = async (sqlQuery: string, args: Array<SQLType> = []) => {
        await this._prepareConnectionPromise;
        await this._migrationPromise;

        return await this._connection.execute(sqlQuery, args);
    };

    public transaction = async <T>(cb: (conn: Connection) => Promise<T>): Promise<T | null> => {
        await this._prepareConnectionPromise;
        await this._migrationPromise;
        const connection = new Connection(this._dbName);
        if (typeof this._params.prepareConnFn === "function") {
            await this._params.prepareConnFn(connection);
        }
        let callbackResult: T | null = null;
        try {
            await connection.beginTransaction();
            try {
                callbackResult = await cb(connection);
                await connection.commitTransaction();
            } catch (e) {
                await connection.rollbackTransaction();
                throw e;
            }
        } catch (e) {
            console.log("caught error in transaction, closing database connection", e);
        } finally {
            await connection.close();
        }
        return callbackResult;
    };

    public close = () => {
        this._connection.close();
    };
}

export const dropTables = async (connection: Connection) => {
    const tables = [
        "transaction_position_history",
        "pending_transaction_position_changes",
        "transaction_position",
        "transaction_history",
        "pending_transaction_changes",
        '"transaction"',
        "group_member",
        "account_history",
        "pending_account_changes",
        "account",
        "grp",
        "abrechnung_instance",
        migrationsTable,
    ];
    for (const table of tables) {
        await connection.execute(`drop table if exists ${table}`);
    }
    const views = [
        "accounts_including_pending_changes",
        "committed_account_changes",
        "last_pending_account_changes",
        "transactions_including_pending_changes",
        "committed_transaction_changes",
        "last_pending_transaction_changes",
        "transaction_positions_including_pending_changes",
        "committed_transaction_positions_changes",
        "last_pending_transaction_position_changes",
    ];
    for (const view of views) {
        await connection.execute(`drop view if exists ${view}`);
    }
};

export const flushDatabase = async () => {
    const tables = [
        "transaction_position_history",
        "pending_transaction_position_changes",
        "transaction_position",
        "transaction_history",
        "pending_transaction_changes",
        '"transaction"',
        "group_member",
        "account_history",
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
};

// When adding new migrations in already deployed app, append them to the end of array, do not re-arrange
// Do not modify migration after app version containing it is published
const migrationsTable = "_migrations";

export const db = new Database("main", {
    prepareConnFn: async (connection: Connection) => {
        try {
            await connection.execute("PRAGMA foreign_keys = ON;");
            // await connection.execute("PRAGMA journal_mode = WAL;") // apparently does not work
        } catch (e) {
            console.log(e);
        }
    },
    migrateFn: async (connection: Connection) => {
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
