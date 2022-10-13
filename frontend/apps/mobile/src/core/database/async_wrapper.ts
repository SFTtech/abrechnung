import * as SQLite from "expo-sqlite";
import { ResultSet, ResultSetError, WebSQLDatabase } from "expo-sqlite";

type SQLType = string | number | Date | boolean | null;

export class Connection {
    private _db: WebSQLDatabase;
    private transacting: boolean;

    constructor(databaseName: string) {
        this._db = SQLite.openDatabase(databaseName);
        this.transacting = false;
    }

    execute(sqlStatement: string, args: Array<SQLType> = []) {
        return new Promise<ResultSet>((resolve, reject) => {
            this._db.exec([{ sql: sqlStatement, args }], false, (err, res) => {
                if (err) {
                    return reject(err);
                }

                if (res[0].hasOwnProperty("error")) {
                    return reject((res[0] as ResultSetError).error);
                }

                resolve(res[0] as ResultSet);
            });
        });
    }

    close() {
        this._db._db.close();
    }

    async beginTransaction() {
        await this.execute("begin transaction");
        this.transacting = true;
    }

    async commitTransaction() {
        await this.execute("commit");
        this.transacting = false;
    }

    async rollbackTransaction() {
        await this.execute("rollback");
        this.transacting = false;
    }
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

    async execute(sqlQuery: string, args: Array<SQLType> = []) {
        await this._prepareConnectionPromise;
        await this._migrationPromise;

        return await this._connection.execute(sqlQuery, args);
    }

    async transaction(cb: (conn: Connection) => any) {
        await this._prepareConnectionPromise;
        await this._migrationPromise;
        const connection = new Connection(this._dbName);
        if (typeof this._params.prepareConnFn === "function") {
            await this._params.prepareConnFn(connection);
        }
        let callbackResult = null;
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
            connection.close();
            throw e;
        }
        await connection.close();
        return callbackResult;
    }

    close() {
        this._connection._db.close();
    }
}
