import { db, Connection, SQLQuery } from "./database";
import {
    Transaction,
    TransactionContainer,
    TransactionPosition,
    TransactionType,
    validatePosition,
    validateTransactionDetails,
    ValidationError,
} from "@abrechnung/types";
import { isOnline, api } from "../api";
import { fromISOString, toISODateString } from "@abrechnung/utils";
import { NotificationEmitter } from "@abrechnung/core";

interface TransactionIdentifier {
    groupID: number;
    transactionID?: number;
}

interface TransactionEventMap {
    changed: TransactionIdentifier;
    // created: TransactionIdentifier;
    // deleted: TransactionIdentifier;
}

interface PositionIdentifier {
    transactionID: number;
    positionID?: number;
}

interface PositionEventMap {
    changed: PositionIdentifier;
    // created: PositionIdentifier;
    // deleted: PositionIdentifier;
}

export const transactionNotifier = new NotificationEmitter<TransactionEventMap>();
export const transactionPositionNotifier = new NotificationEmitter<PositionEventMap>();

interface DatabaseRowTransaction {
    id: number;
    group_id: number;
    type: TransactionType;
    description: string;
    value: number;
    billed_at: string;
    currency_conversion_rate: number;
    currency_symbol: string;
    creditor_shares: string;
    debitor_shares: string;
    deleted: boolean;

    has_unpublished_changes: boolean;
    has_local_changes: boolean;
    last_changed: string;
}

interface DatabaseRowPosition {
    id: number;
    transaction_id: number;
    name: string;
    price: number;
    communist_shares: number;
    usages: string;
    deleted: boolean;
}

const databaseRowToTransaction = (row: DatabaseRowTransaction): Transaction => {
    return {
        id: row.id,
        type: row.type,
        groupID: row.group_id,
        description: row.description,
        value: row.value,
        currencySymbol: row.currency_symbol,
        currencyConversionRate: row.currency_conversion_rate,
        billedAt: fromISOString(row.billed_at),
        creditorShares: row.creditor_shares ? JSON.parse(row.creditor_shares) : null,
        debitorShares: row.debitor_shares ? JSON.parse(row.debitor_shares) : null,
        deleted: row.deleted,
        hasUnpublishedChanges: row.has_unpublished_changes,
        hasLocalChanges: row.has_local_changes,
        lastChanged: fromISOString(row.last_changed),
    };
};

const saveTransactionToDatabase = (transaction: Transaction, positions: TransactionPosition[]): SQLQuery[] => {
    const query1 = {
        sql: `
        insert into "transaction" (id, group_id, type, last_changed, has_unpublished_changes)
        values (?1, ?2, ?3, ?4, ?5)
        on conflict (id) do update set
            last_changed = case when last_changed > excluded.last_changed then last_changed else excluded.last_changed end,
            has_unpublished_changes = has_unpublished_changes or excluded.has_unpublished_changes`,
        args: [
            transaction.id,
            transaction.groupID,
            transaction.type,
            transaction.lastChanged.toISOString(),
            transaction.hasUnpublishedChanges,
        ],
    };
    const query2 = {
        sql: `
        insert into transaction_history (
            id, description, value, billed_at, creditor_shares, debitor_shares, deleted,
            currency_symbol, currency_conversion_rate 
        )
        values (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9
        )
        on conflict (id) do update set
            description              = excluded.description,
            value                    = excluded.value,
            billed_at                = excluded.billed_at,
            creditor_shares          = excluded.creditor_shares,
            debitor_shares           = excluded.debitor_shares,
            deleted                  = excluded.deleted,
            currency_symbol          = excluded.currency_symbol,
            currency_conversion_rate = excluded.currency_conversion_rate`,
        args: [
            transaction.id,
            transaction.description,
            transaction.value,
            toISODateString(transaction.billedAt),
            JSON.stringify(transaction.creditorShares),
            JSON.stringify(transaction.debitorShares),
            transaction.deleted,
            transaction.currencySymbol,
            transaction.currencyConversionRate,
        ],
    };

    const queries = [query1, query2];

    for (const position of positions) {
        queries.push({
            sql: `
            insert into transaction_position (id, transaction_id) 
            values (?1, ?2)
            on conflict do nothing`,
            args: [position.id, position.transactionID],
        });
        queries.push({
            sql: `
            insert into transaction_position_history (
                id, name, price, usages, deleted, communist_shares
            )
            values (?1, ?2, ?3, ?4, ?5, ?6)
            on conflict (id) do update set
                name             = excluded.name,
                price            = excluded.price,
                usages           = excluded.usages,
                deleted          = excluded.deleted,
                communist_shares = excluded.communist_shares`,
            args: [
                position.id,
                position.name,
                position.price,
                JSON.stringify(position.usages),
                position.deleted,
                position.communistShares,
            ],
        });
    }
    return queries;
};

const databaseRowToPosition = (row: DatabaseRowPosition): TransactionPosition => {
    return {
        id: row.id,
        transactionID: row.transaction_id,
        price: row.price,
        usages: row.usages != null ? JSON.parse(row.usages) : null,
        communistShares: row.communist_shares,
        name: row.name,
        deleted: row.deleted,
    };
};

export const syncTransactions = async (groupID: number): Promise<TransactionContainer[]> => {
    const backendTransactions = await api.fetchTransactions(groupID);
    await db.transaction(async (conn: Connection) => {
        const queries = backendTransactions.map((t) => saveTransactionToDatabase(t.transaction, t.positions)).flat();
        await conn.executeMany(queries);
    });
    // TODO: upload pending changes to server
    transactionNotifier.emit("changed", { groupID: groupID });
    return backendTransactions;
};

export const getTransactions = async (groupID: number): Promise<Transaction[]> => {
    const result = await db.execute(`select * from transactions_including_pending_changes where group_id = ?1`, [
        groupID,
    ]);

    return result.rows.map((row) => databaseRowToTransaction(row as DatabaseRowTransaction));
};

export const getTransaction = async (groupID: number, transactionID: number): Promise<Transaction> => {
    const result = await db.execute(
        `select * from transactions_including_pending_changes where group_id = ?1 and id = ?2`,
        [groupID, transactionID]
    );

    return databaseRowToTransaction(result.rows[0] as DatabaseRowTransaction);
};

export const getTransactionsPositionsForGroup = async (groupID: number): Promise<TransactionPosition[]> => {
    const result = await db.execute(
        `select * 
         from transaction_positions_including_pending_changes tp
            join "transaction" t on t.id = tp.transaction_id
         where t.group_id = ?1`,
        [groupID]
    );

    return result.rows.map((row) => databaseRowToPosition(row as DatabaseRowPosition));
};

export const getTransactionsPositions = async (transactionID: number): Promise<TransactionPosition[]> => {
    const result = await db.execute(
        `select * 
        from 
            transaction_positions_including_pending_changes tp 
        where transaction_id = ?1`,
        [transactionID]
    );

    return result.rows.map((row) => databaseRowToPosition(row as DatabaseRowPosition));
};

export const pushLocalTransactionChanges = async (transactionID: number): Promise<TransactionContainer> => {
    if (!(await isOnline())) {
        console.log("cannot push changes to server as we are offline");
        throw Error("Cannot push local changes to server as we are offline");
    }

    return await db.transaction(async (conn: Connection) => {
        console.log("pushing changes to server");
        // fetch the transaction and its pending position changes from the database
        const transactionQueryResult = await conn.execute(
            `select *
            from
                last_pending_transaction_changes pac
            where
                transaction_id = ?1`,
            [transactionID]
        );
        const positionQueryResult = await conn.execute(
            `select *
            from last_pending_transaction_position_changes 
            where transaction_id = ?1`,
            [transactionID]
        );
        if (transactionQueryResult.rows.length === 0 && positionQueryResult.rows.length === 0) {
            return;
        }

        const positions = positionQueryResult.rows.map((row) => databaseRowToPosition(row as DatabaseRowPosition));

        let updatedTransaction: TransactionContainer;

        if (transactionQueryResult.rows.length > 0) {
            console.log("pushing transaction detail plus position changes to server");
            const t = transactionQueryResult.rows[0];
            const transaction = databaseRowToTransaction(t as DatabaseRowTransaction);
            updatedTransaction = await api.pushTransactionChanges(transaction, positions, true);
            await conn.execute(
                `delete
                from
                    pending_transaction_changes
                where
                    transaction_id = ?1`,
                [transactionID]
            );
        } else {
            console.log("pushing only position changes to server");
            updatedTransaction = await api.pushTransactionPositionChanges(transactionID, positions, true);
        }
        await conn.executeMany(saveTransactionToDatabase(updatedTransaction.transaction, updatedTransaction.positions));
        await conn.execute(
            `delete
            from
                pending_transaction_position_changes
            where
                transaction_id = ?1`,
            [transactionID]
        );
        console.log("successfully synced local changes with server and saved the result to local database");

        transactionNotifier.emit("changed", {
            groupID: updatedTransaction.transaction.groupID,
        });
        transactionPositionNotifier.emit("changed", {
            transactionID: transactionID,
        });
        if (updatedTransaction.transaction.id !== transactionID) {
            transactionPositionNotifier.emit("changed", {
                transactionID: transactionID,
            });
        }

        return updatedTransaction;
    });
};

export const updateTransaction = async (t: Transaction) => {
    const validationErrors = validateTransactionDetails(t);
    if (Object.keys(validationErrors).length > 0) {
        throw new ValidationError(validationErrors);
    }

    console.log("saving local transaction changes");
    return await db.transaction(async (conn: Connection) => {
        // get previous pending change
        const updateTime = new Date();
        await conn.execute(`update "transaction" set last_changed = ?2, has_unpublished_changes = true where id = ?1`, [
            t.id,
            updateTime.toISOString(),
        ]);

        await conn.execute(
            `insert into pending_transaction_changes (
                id, change_time, description, value, billed_at, currency_conversion_rate, currency_symbol, 
                creditor_shares, debitor_shares, deleted
            )
             values (
                 ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10
             )`,
            [
                t.id,
                updateTime.toISOString(),
                t.description,
                t.value,
                toISODateString(t.billedAt),
                t.currencyConversionRate,
                t.currencySymbol,
                JSON.stringify(t.creditorShares),
                JSON.stringify(t.debitorShares),
                t.deleted,
            ]
        );
        transactionNotifier.emit("changed", { groupID: t.groupID, transactionID: t.id });
    });
};

export const createTransaction = async (groupID: number, type: TransactionType): Promise<[number, Date]> => {
    const t = {
        type: type,
        groupID: groupID,
        value: 0,
        billedAt: new Date(),
        description: "",
        currencyConversionRate: 1.0,
        currencySymbol: "€",
        creditorShares: {},
        debitorShares: {},
        deleted: false,
    };

    return await db.transaction(async (conn: Connection) => {
        const res = await conn.execute(
            `select
                coalesce(min(id), -1) as curr_min_id
            from
                "transaction"
            where
                id < 0 and`,
            []
        );
        const nextID = Math.min(res.rows[0].curr_min_id, 0) - 1;
        const creationTime = new Date();
        await conn.execute(
            `insert into "transaction" (
                id, group_id, type, has_unpublished_changes, last_changed
            )
            values (
                ?1, ?2, ?3, true, ?4
            )`,
            [nextID, groupID, type, creationTime.toISOString()]
        );

        await conn.execute(
            `insert into pending_transaction_changes (
                id, change_time, description, value, billed_at, currency_conversion_rate, currency_symbol, 
                creditor_shares, debitor_shares, deleted
            )
             values (
                 ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10
             )`,
            [
                nextID,
                creationTime.toISOString(),
                t.description,
                t.value,
                toISODateString(t.billedAt),
                t.currencyConversionRate,
                t.currencySymbol,
                JSON.stringify(t.creditorShares),
                JSON.stringify(t.debitorShares),
                t.deleted,
            ]
        );
        transactionNotifier.emit("changed", { groupID: groupID });
        return [nextID, creationTime];
    });
};

export const deleteTransaction = async (groupID: number, transactionID: number) => {
    if (transactionID < 0) {
        return await deleteLocalTransactionChanges(groupID, transactionID);
    }

    const transaction = await getTransaction(groupID, transactionID);
    transaction.deleted = true;
    return await updateTransaction(transaction);
};

export const deleteLocalTransactionChanges = async (
    groupID: number,
    transactionID: number,
    olderThan?: string
): Promise<boolean> => {
    console.log("deleting local transaction changes to transaction", transactionID, "older than", olderThan);
    // returns true if a local only transaction was deleted fully
    return await db.transaction(async (conn: Connection) => {
        if (olderThan) {
            await conn.execute(
                `delete
                from
                    pending_transaction_changes
                where
                    id = ?1
                    and change_time >= ?2`,
                [transactionID, olderThan]
            );
            await conn.execute(
                `delete
                from
                    pending_transaction_position_changes
                where
                    transaction_id = ?1
                    and change_time >= ?2`,
                [transactionID, olderThan]
            );
        } else {
            await conn.execute(
                `delete
                from
                    pending_transaction_changes
                where
                    id = ?1`,
                [transactionID]
            );
            await conn.execute(
                `delete
                from
                    pending_transaction_position_changes
                where
                    transaction_id = ?1`,
                [transactionID]
            );
        }

        let deletedLocalTransaction = false;
        if (transactionID < 0) {
            const nLocalChanges = await conn.execute(
                `select
                    count(*) as n_local_changes
                from
                    pending_transaction_changes
                where
                    transaction_id = ?1`,
                [transactionID]
            );
            deletedLocalTransaction = nLocalChanges.rows[0].n_local_changes === 0;

            if (deletedLocalTransaction) {
                await conn.execute(`delete from "transaction" where id = ?1`, [transactionID]);
            }
        }

        transactionNotifier.emit("changed", { groupID: groupID });
        transactionPositionNotifier.emit("changed", {
            transactionID: transactionID,
        });

        return deletedLocalTransaction;
    });
};

/**
 *  TODO: deprecate this by using a sqlite trigger which does the same
 */
const updateTransactionMetadata = async (
    conn: Connection,
    transactionID: number,
    lastChanged: Date,
    hasUnpublishedChanges: boolean
): Promise<void> => {
    await conn.execute(`update "transaction" set last_changed = ?2, has_unpublished_changes = ?3`, [
        transactionID,
        lastChanged.toISOString(),
        hasUnpublishedChanges,
    ]);
};

export const createPosition = async (
    groupID: number,
    transactionID: number,
    copyFromPosition: TransactionPosition | null = null
) => {
    const p = {
        name: copyFromPosition?.name ?? "",
        price: copyFromPosition?.price ?? 0,
        communistShares: copyFromPosition?.communistShares ?? 0,
        usages: copyFromPosition?.usages ?? {},
        deleted: false,
    };

    return await db.transaction(async (conn: Connection) => {
        const res = await conn.execute(
            `select
                coalesce(min(id), -1) as curr_min_id
            from
                transaction_position`,
            [transactionID]
        );
        const nextID = Math.min(res.rows[0].curr_min_id, 0) - 1;
        const creationTime = new Date();
        await updateTransactionMetadata(conn, transactionID, creationTime, true);
        await conn.execute(
            `insert into transaction_position (
                id, transaction_id
            ) values (?1, ?2)`,
            [nextID, transactionID]
        );
        await conn.execute(
            `insert into pending_transaction_position_changes (
                id, change_time, name, price, communist_shares, usages, deleted
            )
            values (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
            [
                nextID,
                creationTime.toISOString(),
                p.name,
                p.price,
                p.communistShares,
                JSON.stringify(p.usages),
                p.deleted,
            ]
        );
        transactionPositionNotifier.emit("changed", {
            transactionID: transactionID,
        });
        console.log("created new local position for transaction with id", transactionID);
        return nextID;
    });
};

export const updatePosition = async (p: TransactionPosition) => {
    const validationErrors = validatePosition(p);
    if (validationErrors !== null) {
        throw new ValidationError(validationErrors);
    }

    return await db.transaction(async (conn: Connection) => {
        const updateTime = new Date();
        await updateTransactionMetadata(conn, p.transactionID, updateTime, true);
        await conn.execute(
            `insert into pending_transaction_position_changes (
                id, change_time, name, price, communist_shares, usages, deleted
            )
            values (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
            [p.id, updateTime.toISOString(), p.name, p.price, p.communistShares, JSON.stringify(p.usages), p.deleted]
        );
        transactionPositionNotifier.emit("changed", {
            transactionID: p.transactionID,
        });
    });
};

export const deletePosition = async (p: TransactionPosition) => {
    // TODO: determine if we keep around local only positions once deleted
    return await db.transaction(async (conn: Connection) => {
        const updateTime = new Date();
        await updateTransactionMetadata(conn, p.transactionID, updateTime, true);
        await conn.execute(
            `insert into pending_transaction_position_changes (
                id, change_time, name, price, communist_shares, usages, deleted
            )
            values (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
            [p.id, updateTime.toISOString(), p.name, p.price, p.communistShares, JSON.stringify(p.usages), true]
        );
        transactionPositionNotifier.emit("changed", {
            transactionID: p.transactionID,
        });
    });
};
