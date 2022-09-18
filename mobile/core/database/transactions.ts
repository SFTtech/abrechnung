import { db } from "./index";
import NotificationTracker from "../index";
import {
    Transaction,
    TransactionPosition,
    TransactionType,
    validatePosition,
    validateTransaction,
    ValidationError,
} from "../types";
import { fetchTransactions, pushTransactionChanges, pushTransactionPositionChanges } from "../api/transactions";
import { isOnline } from "../api";
import { fromISOString, toISODateString, toISOString } from "../utils";

type transactionNotifierPayload = {
    group_id: number,
    transaction_id?: number;
}

type transactionPositionPayload = {
    transaction_id?: number;
}

export const transactionNotifier = new NotificationTracker<transactionNotifierPayload>();
export const transactionPositionNotifier = new NotificationTracker<transactionPositionPayload>();


function databaseRowToTransaction(row): Transaction {
    let parsed_event = row.event_content !== null ? JSON.parse(row.event_content) : null;
    if (parsed_event !== null) {
        parsed_event.billed_at = fromISOString(parsed_event.billed_at);
    }
    return <Transaction>{
        id: row.id,
        type: row.type,
        group_id: row.group_id,
        description: row.description,
        value: row.value,
        currency_symbol: row.currency_symbol,
        currency_conversion_rate: row.currency_conversion_rate,
        billed_at: fromISOString(row.billed_at),
        creditor_shares: row.creditor_shares ? JSON.parse(row.creditor_shares) : null,
        debitor_shares: row.debitor_shares ? JSON.parse(row.debitor_shares) : null,
        deleted: row.deleted,
        revision_started_at: fromISOString(row.revision_started_at),
        revision_committed_at: fromISOString(row.revision_committed_at),
        version: row.version,
        is_wip: row.is_wip,
        last_changed: row.event_time !== null ? fromISOString(row.event_time) : row.revision_committed_at !== null ? fromISOString(row.revision_committed_at) : fromISOString(row.revision_started_at),
        ...parsed_event,
        has_local_changes: row.event_content !== null,
    };
}

function transactionFromEvent(transaction_id: number, group_id: number, event_time: string, event): Transaction {
    return <Transaction>{
        id: transaction_id,
        group_id: group_id,
        version: 0,
        revision_started_at: null,
        revision_committed_at: null,
        last_changed: fromISOString(event_time),
        ...event,
        billed_at: fromISOString(event.billed_at),
        has_local_changes: true,
    };
}

async function saveTransactionToDatabase(transaction: Transaction, positions: TransactionPosition[], conn?) {
    const transactionInsertQuery = `
        insert into "transaction" (
            id, group_id, type, description, value, billed_at, creditor_shares, debitor_shares, deleted,
            currency_symbol, currency_conversion_rate, revision_started_at,
            revision_committed_at, version, is_wip
        )
        values (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15
        )
        on conflict (id) do update set
                                       group_id                 = excluded.group_id,
                                       type                     = excluded.type,
                                       description              = excluded.description,
                                       value                    = excluded.value,
                                       billed_at                = excluded.billed_at,
                                       creditor_shares          = excluded.creditor_shares,
                                       debitor_shares           = excluded.debitor_shares,
                                       deleted                  = excluded.deleted,
                                       currency_symbol          = excluded.currency_symbol,
                                       currency_conversion_rate = excluded.currency_conversion_rate,
                                       revision_started_at      = excluded.revision_started_at,
                                       revision_committed_at    = excluded.revision_committed_at,
                                       version                  = excluded.version,
                                       is_wip                   = excluded.is_wip
    `;
    const queryParams = [transaction.id,
        transaction.group_id,
        transaction.type,
        transaction.description,
        transaction.value,
        toISODateString(transaction.billed_at),
        JSON.stringify(transaction.creditor_shares),
        JSON.stringify(transaction.debitor_shares),
        transaction.deleted,
        transaction.currency_symbol,
        transaction.currency_conversion_rate,
        toISOString(transaction.revision_started_at),
        toISOString(transaction.revision_committed_at),
        transaction.version,
        transaction.is_wip];

    const positionInsertQuery = `
        insert into transaction_position (
            id, group_id, transaction_id, name, price, usages, deleted, communist_shares
        )
        values (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8
        )
        on conflict (id) do update set
                                       group_id         = excluded.group_id,
                                       transaction_id   = excluded.transaction_id,
                                       name             = excluded.name,
                                       price            = excluded.price,
                                       usages           = excluded.usages,
                                       deleted          = excluded.deleted,
                                       communist_shares = excluded.communist_shares
    `;
    if (conn) {
        return Promise.all([
            conn.execute(transactionInsertQuery, queryParams),
            ...positions.map(position => conn.execute(positionInsertQuery, [position.id, transaction.group_id, transaction.id, position.name, position.price, JSON.stringify(position.usages), position.deleted, position.communist_shares])),
        ]);
    } else {
        return db.transaction(async (conn) => {
            await Promise.all([
                conn.execute(transactionInsertQuery, queryParams),
                ...positions.map(position => conn.execute(positionInsertQuery, [position.id, transaction.group_id, transaction.id, position.name, position.price, JSON.stringify(position.usages), position.deleted, position.communist_shares])),
            ]);
        });
    }
}

function databaseRowToPosition(row): TransactionPosition {
    const parsed_event = row.event_content !== null ? JSON.parse(row.event_content) : {};
    return <TransactionPosition>{
        id: row.id,
        transaction_id: row.transaction_id,
        price: row.price,
        usages: row.usages != null ? JSON.parse(row.usages) : null,
        communist_shares: row.communist_shares,
        deleted: row.deleted,
        name: row.name,
        group_id: row.group_id,
        ...parsed_event,
        has_local_changes: row.event_content !== null,
    };
}

function transactionPositionFromEvent(position_id: number, transaction_id: number, group_id: number, event_time: string, event): TransactionPosition {
    return <TransactionPosition>{
        id: position_id,
        transaction_id: transaction_id,
        group_id: group_id,
        ...event,
        has_local_changes: true,
    };
}

export async function syncTransactions(groupID: number): Promise<[Transaction, TransactionPosition[]][]> {
    const backendTransactions = await fetchTransactions({ groupID });
    await db.transaction((conn) => {
        backendTransactions.forEach(t => {
            const [transaction, positions] = t;
            transactionPositionNotifier.notify(transaction.id, { transaction_id: transaction.id });
            saveTransactionToDatabase(transaction, positions, conn);
        });
    });
    // TODO: upload pending changes to server
    transactionNotifier.notify(groupID, { group_id: groupID });
    return backendTransactions;
}

export async function getTransactions(group_id: number): Promise<Transaction[]> {
    const result = await db.execute(
        `select
             t.id,
             t.group_id,
             t.type,
             t.description,
             t.value,
             t.currency_symbol,
             t.currency_conversion_rate,
             t.creditor_shares,
             t.debitor_shares,
             t.billed_at,
             t.deleted,
             t.revision_started_at,
             t.revision_committed_at,
             t.version,
             t.is_wip,
             aggregated_events.event_time,
             aggregated_events.event_content
         from
             "transaction" t
             left outer join (
                 select *
                 from
                     (
                         select
                             row_number() over (partition by transaction_id order by event_id desc) as rank,
                             *
                         from
                             pending_transaction_changes
                         where
                             transaction_id >= 0
                             and group_id = ?
                     ) sub
                 where
                     sub.rank = 1
                             ) aggregated_events
                             on aggregated_events.transaction_id = t.id and aggregated_events.group_id = t.group_id
         where
             t.id >= 0
             and t.group_id = ?`
        , [group_id, group_id],
    );

    const serverTransactions = result.rows.map(row => databaseRowToTransaction(row));

    const localTransactionsQueryResult = await db.execute(`
                select *
                from
                    (
                        select
                            row_number() over (partition by transaction_id order by event_id desc) as rank,
                            *
                        from
                            pending_transaction_changes
                        where
                            transaction_id < 0
                            and group_id = ?
                    ) sub
                where
                    sub.rank = 1`
        , [group_id]);
    const localTransactions = localTransactionsQueryResult.rows.map(row => transactionFromEvent(row.transaction_id, row.group_id, row.event_time, JSON.parse(row.event_content)));

    return localTransactions.concat(...serverTransactions);
}

export async function getTransaction(group_id: number, transaction_id: number): Promise<Transaction> {
    if (transaction_id < 0) { // we are dealing with a local only account
        const result = await db.execute(
            `select *
             from
                 (
                     select
                         row_number() over (partition by transaction_id order by event_id desc) as rank,
                         *
                     from
                         pending_transaction_changes
                     where
                         group_id = ?1
                         and transaction_id = ?2
                 ) sub
             where
                 sub.rank = 1`,
            [group_id, transaction_id],
        );
        // TODO: check empty result
        const parsedEvent = JSON.parse(result.rows[0].event_content);
        return transactionFromEvent(transaction_id, result.rows[0].group_id, result.rows[0].event_time, parsedEvent);
    } else {
        const result = await db.execute(
            `select
                 t.id,
                 t.group_id,
                 t.type,
                 t.description,
                 t.value,
                 t.currency_symbol,
                 t.currency_conversion_rate,
                 t.creditor_shares,
                 t.debitor_shares,
                 t.billed_at,
                 t.deleted,
                 t.revision_started_at,
                 t.revision_committed_at,
                 t.version,
                 t.is_wip,
                 aggregated_events.event_time,
                 aggregated_events.event_content
             from
                 "transaction" t
                 left outer join (
                     select *
                     from
                         (
                             select
                                 row_number() over (partition by transaction_id order by event_id desc) as rank,
                                 *
                             from
                                 pending_transaction_changes
                             where
                                 transaction_id = ?2
                                 and group_id = ?1
                         ) sub
                     where
                         sub.rank = 1
                                 ) aggregated_events
                                 on aggregated_events.transaction_id = t.id and aggregated_events.group_id = t.group_id
             where
                 t.id = ?2
                 and t.group_id = ?1`,
            [group_id, transaction_id],
        );

        return databaseRowToTransaction(result.rows[0]);
    }
}

export async function getTransactionsPositionsForGroup(group_id: number): Promise<TransactionPosition[]> {
    const result = await db.execute(
        `select
             t.id,
             t.transaction_id,
             t.price,
             t.communist_shares,
             t.usages,
             t.name,
             t.deleted,
             aggregated_events.event_time,
             aggregated_events.event_content
         from
             transaction_position t
             left outer join (
                 select *
                 from
                     (
                         select
                             row_number() over (partition by position_id order by event_id desc) as rank,
                             *
                         from
                             pending_transaction_position_changes ptc
                         where
                             position_id >= 0
                             and ptc.group_id = ?1
                     ) sub
                 where
                     sub.rank = 1
                             ) aggregated_events on aggregated_events.position_id = t.id and
                                                    aggregated_events.transaction_id = t.transaction_id
         where
             t.id >= 0
             and t.group_id = ?1`
        , [group_id],
    );

    const serverPositions = result.rows.map(row => databaseRowToPosition(row));

    const localPositionsQueryResult = await db.execute(`
                select *
                from
                    (
                        select
                            row_number() over (partition by position_id order by event_id desc) as rank,
                            *
                        from
                            pending_transaction_position_changes ptc
                        where
                            position_id < 0
                            and group_id = ?1
                    ) sub
                where
                    sub.rank = 1`
        , [group_id]);
    const localPositions = localPositionsQueryResult.rows.map(row => transactionPositionFromEvent(row.position_id, row.transaction_id, row.group_id, row.event_time, JSON.parse(row.event_content)));

    return localPositions.concat(...serverPositions);
}

export async function getTransactionsPositions(transaction_id: number): Promise<TransactionPosition[]> {
    const result = await db.execute(
        `select
             t.id,
             t.transaction_id,
             t.price,
             t.communist_shares,
             t.usages,
             t.name,
             t.deleted,
             aggregated_events.event_time,
             aggregated_events.event_content
         from
             transaction_position t
             left outer join (
                 select *
                 from
                     (
                         select
                             row_number() over (partition by position_id order by event_id desc) as rank,
                             *
                         from
                             pending_transaction_position_changes
                         where
                             position_id >= 0
                             and transaction_id = ?1
                     ) sub
                 where
                     sub.rank = 1
                             ) aggregated_events on aggregated_events.position_id = t.id and
                                                    aggregated_events.transaction_id = t.transaction_id
         where
             t.id >= 0
             and t.transaction_id = ?1`
        , [transaction_id],
    );

    const serverPositions = result.rows.map(row => databaseRowToPosition(row));

    const localPositionsQueryResult = await db.execute(`
                select *
                from
                    (
                        select
                            row_number() over (partition by position_id order by event_id desc) as rank,
                            *
                        from
                            pending_transaction_position_changes
                        where
                            position_id < 0
                            and transaction_id = ?1
                    ) sub
                where
                    sub.rank = 1`
        , [transaction_id]);
    const localPositions = localPositionsQueryResult.rows.map(row => transactionPositionFromEvent(row.position_id, row.transaction_id, row.group_id, row.event_time, JSON.parse(row.event_content)));

    return localPositions.concat(...serverPositions);
}

export async function pushLocalTransactionChanges(transaction_id: number): Promise<[Transaction, TransactionPosition[]]> {
    if (!(await isOnline())) {
        console.log("cannot push changes to server as we are offline");
        throw Error("Cannot push local changes to server as we are offline");
    }

    return await db.transaction(async (conn) => {
        console.log("pushing changes to server");
        // fetch the transaction and its pending position changes from the database
        const transactionQueryResult = await conn.execute(`select *
                                                           from
                                                               pending_transaction_changes pac
                                                           where
                                                               transaction_id = ?1
                                                           order by
                                                               event_time desc
                                                           limit 1`, [transaction_id]);
        const positionQueryResult = await conn.execute(`
            select *
            from
                (
                    select
                        row_number() over (partition by position_id order by event_id desc) as rank,
                        *
                    from
                        pending_transaction_position_changes
                    where
                        transaction_id = ?1
                ) sub
            where
                sub.rank = 1`, [transaction_id]);
        if (transactionQueryResult.rows.length === 0 && positionQueryResult.rows.length === 0) {
            return;
        }

        const positions = positionQueryResult.rows.map(row => transactionPositionFromEvent(row.position_id, row.transaction_id, row.group_id, row.event_time, JSON.parse(row.event_content)));

        let [updatedTransaction, updatedPositions] = [null, null];

        if (transactionQueryResult.rows.length > 0) {
            console.log("pushing transaction detail plus position changes to server");
            const t = transactionQueryResult.rows[0];
            const transaction = transactionFromEvent(t.transaction_id, t.group_id, t.event_time, JSON.parse(t.event_content));
            [updatedTransaction, updatedPositions] = await pushTransactionChanges(transaction, positions, true);
            await conn.execute(`
                delete
                from
                    pending_transaction_changes
                where
                    transaction_id = ?1
            `, [transaction_id]);
        } else {
            console.log("pushing only position changes to server");
            [updatedTransaction, updatedPositions] = await pushTransactionPositionChanges(transaction_id, positions, true);
        }
        await saveTransactionToDatabase(updatedTransaction, updatedPositions, conn);
        await conn.execute(`
            delete
            from
                pending_transaction_position_changes
            where
                transaction_id = ?1
        `, [transaction_id]);
        console.log("successfully synced local changes with server and saved the result to local database");

        transactionNotifier.notify(updatedTransaction.group_id, {
            group_id: updatedTransaction.groupID,
        });
        transactionPositionNotifier.notify(updatedTransaction.id, { transaction_id: transaction_id });
        if (updatedTransaction.transaction_id !== transaction_id) {
            transactionPositionNotifier.notify(transaction_id, { transaction_id: transaction_id });
        }

        return [updatedTransaction, updatedPositions];
    });
}

export async function updateTransaction(transaction: Transaction) {
    const validationErrors = validateTransaction(transaction);
    if (Object.keys(validationErrors).length > 0) {
        throw new ValidationError(validationErrors);
    }

    console.log("saving local transaction changes");
    const event_payload = {
        description: transaction.description,
        value: transaction.value,
        currency_symbol: transaction.currency_symbol,
        currency_conversion_rate: transaction.currency_conversion_rate,
        billed_at: toISODateString(transaction.billed_at),
        creditor_shares: transaction.creditor_shares,
        debitor_shares: transaction.debitor_shares,
        deleted: transaction.deleted,
    };
    return await db.transaction(async (conn) => {
        // get previous pending change
        const previous = await conn.execute(`select *
                                             from
                                                 pending_transaction_changes
                                             where
                                                 transaction_id = ?1
                                             order by
                                                 event_time desc
                                             limit 1`, [transaction.id]);

        const updatedPayload = previous.rows.length > 0 ? { ...JSON.parse(previous.rows[0].event_content), ...event_payload } : event_payload;

        await conn.execute(
            `insert into pending_transaction_changes (
                transaction_id, group_id, event_content, event_time
            )
             values (
                 ?, ?, ?, ?
             )`, [transaction.id, transaction.group_id, JSON.stringify(updatedPayload), toISOString(new Date())],
        );
        transactionNotifier.notify(transaction.group_id, {
            group_id: transaction.group_id,
            transaction_id: transaction.id,
        });
    });
}

export async function createTransaction(group_id: number, type: TransactionType): Promise<[number, Date]> {
    const event_payload = {
        type: type,
        group_id: group_id,
        value: 0,
        billed_at: toISODateString(new Date()),
        description: "",
        currency_conversion_rate: 1.0,
        currency_symbol: "€",
        creditor_shares: {},
        debitor_shares: {},
        deleted: false,
    };


    return await db.transaction(async (conn) => {
        const res = await conn.execute(`
            select
                coalesce(min(pac.transaction_id), -1) as curr_min_id
            from
                pending_transaction_changes pac
            where
                pac.group_id = ?
        `, [group_id]);
        const next_id = Math.min(res.rows[0].curr_min_id, 0) - 1;
        const creationDate = new Date();
        await conn.execute(`
            insert into pending_transaction_changes (
                transaction_id, group_id, event_content, event_time
            )
            values (
                ?, ?, ?, ?
            )`, [next_id, group_id, JSON.stringify(event_payload), toISOString(creationDate)]);
        transactionNotifier.notify(group_id, { group_id: group_id });
        return [next_id, creationDate];
    });
}

export async function deleteTransaction(group_id: number, transaction_id: number) {
    if (transaction_id < 0) {
        return await deleteLocalTransactionChanges(group_id, transaction_id);
    }

    let transaction = await getTransaction(group_id, transaction_id);
    transaction.deleted = true;
    return await updateTransaction(transaction);
}

export async function deleteLocalTransactionChanges(group_id: number, transaction_id: number, olderThan?: string): Promise<boolean> {
    console.log("deleting local transaction changes to transaction", transaction_id, "older than", olderThan);
    // returns true if a local only transaction was deleted fully
    return await db.transaction(async (conn) => {
        if (olderThan) {
            await conn.execute(`
                delete
                from
                    pending_transaction_changes
                where
                    transaction_id = ?1
                    and event_time >= ?2
            `, [transaction_id, olderThan]);
            await conn.execute(`
                delete
                from
                    pending_transaction_position_changes
                where
                    transaction_id = ?1
                    and event_time >= ?2
            `, [transaction_id, olderThan]);
        } else {

            await conn.execute(`
                delete
                from
                    pending_transaction_changes
                where
                    transaction_id = ?1
            `, [transaction_id]);
            await conn.execute(`
                delete
                from
                    pending_transaction_position_changes
                where
                    transaction_id = ?1
            `, [transaction_id]);
        }

        let deletedLocalTransaction = false;
        if (transaction_id < 0) {
            const n_local_changes = await conn.execute(`select
                                                            count(*) as n_local_changes
                                                        from
                                                            pending_transaction_changes
                                                        where
                                                            transaction_id = ?1`, [transaction_id]);
            deletedLocalTransaction = n_local_changes.rows[0].n_local_changes === 0;
        }

        transactionNotifier.notify(group_id, { group_id: group_id });
        transactionPositionNotifier.notify(transaction_id, { transaction_id: transaction_id });

        return deletedLocalTransaction;
    });
}

export async function createPosition(group_id: number, transaction_id: number, copyFromPosition: TransactionPosition | null = null) {
    const event_payload = {
        transaction_id: transaction_id,
        name: copyFromPosition?.name ?? "",
        price: copyFromPosition?.price ?? 0,
        communist_shares: copyFromPosition?.communist_shares ?? 0,
        usages: copyFromPosition?.usages ?? {},
        deleted: false,
    };

    return await db.transaction(async (conn) => {
        const res = await conn.execute(`
            select
                coalesce(min(pac.position_id), -1) as curr_min_id
            from
                pending_transaction_position_changes pac
            where
                pac.transaction_id = ?
        `, [transaction_id]);
        const next_id = Math.min(res.rows[0].curr_min_id, 0) - 1;
        await conn.execute(`
            insert into pending_transaction_position_changes (
                group_id, position_id, transaction_id, event_content, event_time
            )
            values (
                ?, ?, ?, ?, ?
            )`, [group_id, next_id, transaction_id, JSON.stringify(event_payload), toISOString(new Date())]);
        transactionPositionNotifier.notify(transaction_id, { transaction_id: transaction_id });
        console.log("created new local position for transaction with id", transaction_id);
        return next_id;
    });
}

export async function updatePosition(position: TransactionPosition) {
    const validationErrors = validatePosition(position);
    if (validationErrors !== null) {
        throw new ValidationError(validationErrors);
    }

    const event_payload = {
        name: position.name,
        price: position.price,
        communist_shares: position.communist_shares,
        usages: position.usages,
        deleted: position.deleted,
    };
    return await db.transaction(async (conn) => {
        await conn.execute(
            `insert into pending_transaction_position_changes (
                position_id, group_id, transaction_id, event_content, event_time
            )
             values (
                 ?, ?, ?, ?, ?
             )`, [position.id, position.group_id, position.transaction_id, JSON.stringify(event_payload), toISOString(new Date())],
        );
        transactionPositionNotifier.notify(position.transaction_id, { transaction_id: position.transaction_id });
    });
}

export async function deletePosition(position: TransactionPosition) {
    // TODO: determine if we keep around local only positions once deleted
    return await db.transaction(async (conn) => {
        const event_payload = {
            transaction_id: position.transaction_id,
            name: position.name,
            price: position.price,
            communist_shares: position.communist_shares,
            usages: position.usages,
            deleted: true,
        };
        await conn.execute(`
            insert into pending_transaction_position_changes (
                position_id, group_id, transaction_id, event_content, event_time
            )
            values (
                ?, ?, ?, ?, ?
            )`, [position.id, position.group_id, position.transaction_id, JSON.stringify(event_payload), toISOString(new Date())]);
        transactionPositionNotifier.notify(position.transaction_id, { transaction_id: position.transaction_id });
    });
}
