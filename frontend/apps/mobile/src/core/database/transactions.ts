import { db } from "./index";
import {
    TransactionDetails,
    TransactionPosition,
    TransactionType,
    validatePosition,
    validateTransactionDetails,
    ValidationError,
} from "@abrechnung/types";
import { isOnline, api } from "../api";
import { fromISOString, fromISOStringNullable, toISODateString, toISOStringNullable } from "@abrechnung/utils";
import { Connection } from "./async_wrapper";
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
    groupID: number;
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

type TransactionEventPayload = { billedAt: string } & Pick<
    TransactionDetails,
    | "groupID"
    | "type"
    | "description"
    | "value"
    | "currencySymbol"
    | "currencyConversionRate"
    | "creditorShares"
    | "debitorShares"
    | "deleted"
>;
type PositionEventPayload = Pick<
    TransactionPosition,
    "transactionID" | "name" | "price" | "usages" | "communistShares" | "deleted"
>;

function databaseRowToTransaction(row: any): TransactionDetails {
    const parsedEvent = row.event_content !== null ? JSON.parse(row.event_content) : null;
    if (parsedEvent !== null) {
        parsedEvent.billedAt = fromISOString(parsedEvent.billedAt);
    }
    const revision_started_at = fromISOStringNullable(row.revision_started_at);
    const revision_committed_at = fromISOStringNullable(row.revision_committed_at);
    const eventTime = fromISOStringNullable(row.event_time);
    return {
        id: row.id,
        type: row.type,
        group_id: row.group_id,
        description: row.description,
        value: row.value,
        currencySymbol: row.currency_symbol,
        currencyConversionRate: row.currency_conversion_rate,
        billedAt: fromISOStringNullable(row.billed_at),
        creditorShares: row.creditor_shares ? JSON.parse(row.creditor_shares) : null,
        debitorShares: row.debitor_shares ? JSON.parse(row.debitor_shares) : null,
        deleted: row.deleted,
        revisionStartedAt: revision_started_at,
        revisionCommittedAt: revision_committed_at,
        version: row.version,
        isWip: row.is_wip,
        lastChanged: eventTime ?? revision_committed_at ?? revision_started_at,
        ...parsedEvent,
        hasLocalChanges: row.event_content !== null,
    };
}

function transactionFromEvent(
    transactionID: number,
    groupID: number,
    eventTime: string,
    event: TransactionEventPayload
): TransactionDetails {
    return {
        id: transactionID,
        version: 0,
        revisionStartedAt: null,
        revisionCommittedAt: null,
        lastChanged: fromISOString(eventTime),
        ...event,
        isWip: false,
        billedAt: fromISOString(event.billedAt),
        hasLocalChanges: true,
    };
}

async function saveTransactionToDatabase(
    transaction: TransactionDetails,
    positions: TransactionPosition[],
    conn?: Connection
) {
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
    const queryParams = [
        transaction.id,
        transaction.groupID,
        transaction.type,
        transaction.description,
        transaction.value,
        toISODateString(transaction.billedAt),
        JSON.stringify(transaction.creditorShares),
        JSON.stringify(transaction.debitorShares),
        transaction.deleted,
        transaction.currencySymbol,
        transaction.currencyConversionRate,
        toISOStringNullable(transaction.revisionStartedAt),
        toISOStringNullable(transaction.revisionCommittedAt),
        transaction.version,
        transaction.isWip,
    ];

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
            ...positions.map((position) =>
                conn.execute(positionInsertQuery, [
                    position.id,
                    transaction.groupID,
                    transaction.id,
                    position.name,
                    position.price,
                    JSON.stringify(position.usages),
                    position.deleted,
                    position.communistShares,
                ])
            ),
        ]);
    } else {
        return db.transaction(async (conn: Connection) => {
            await Promise.all([
                conn.execute(transactionInsertQuery, queryParams),
                ...positions.map((position) =>
                    conn.execute(positionInsertQuery, [
                        position.id,
                        transaction.groupID,
                        transaction.id,
                        position.name,
                        position.price,
                        JSON.stringify(position.usages),
                        position.deleted,
                        position.communistShares,
                    ])
                ),
            ]);
        });
    }
}

function databaseRowToPosition(row: any): TransactionPosition {
    const parsed_event: PositionEventPayload | null = row.event_content !== null ? JSON.parse(row.event_content) : {};
    return {
        id: row.id,
        transactionID: row.transaction_id,
        price: row.price,
        usages: row.usages != null ? JSON.parse(row.usages) : null,
        communistShares: row.communist_shares,
        deleted: row.deleted,
        name: row.name,
        groupID: row.group_id,
        ...parsed_event,
        hasLocalChanges: row.event_content !== null,
    } as TransactionPosition;
}

function transactionPositionFromEvent(
    positionID: number,
    transactionID: number,
    groupID: number,
    eventTime: string,
    event: PositionEventPayload
): TransactionPosition {
    return {
        id: positionID,
        groupID: groupID,
        ...event,
        hasLocalChanges: true,
    };
}

export async function syncTransactions(groupID: number): Promise<[TransactionDetails, TransactionPosition[]][]> {
    const backendTransactions = await api.fetchTransactions(groupID);
    await db.transaction((conn: Connection) => {
        backendTransactions.forEach((t) => {
            const [transaction, positions] = t;
            transactionPositionNotifier.emit("changed", { groupID: groupID, transactionID: transaction.id });
            saveTransactionToDatabase(transaction, positions, conn);
        });
    });
    // TODO: upload pending changes to server
    transactionNotifier.emit("changed", { groupID: groupID });
    return backendTransactions;
}

export async function getTransactions(groupID: number): Promise<TransactionDetails[]> {
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
                             and group_id = ?1
                     ) sub
                 where
                     sub.rank = 1
                             ) aggregated_events
                             on aggregated_events.transaction_id = t.id and aggregated_events.group_id = t.group_id
         where
             t.id >= 0
             and t.group_id = ?1`,
        [groupID]
    );

    const serverTransactions = result.rows.map((row) => databaseRowToTransaction(row));

    const localTransactionsQueryResult = await db.execute(
        `select *
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
            sub.rank = 1`,
        [groupID]
    );
    const localTransactions = localTransactionsQueryResult.rows.map((row) =>
        transactionFromEvent(row.transaction_id, row.group_id, row.event_time, JSON.parse(row.event_content))
    );

    return localTransactions.concat(...serverTransactions);
}

export async function getTransaction(groupID: number, transactionID: number): Promise<TransactionDetails> {
    if (transactionID < 0) {
        // we are dealing with a local only account
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
            [groupID, transactionID]
        );
        // TODO: check empty result
        const parsedEvent = JSON.parse(result.rows[0].event_content);
        return transactionFromEvent(transactionID, result.rows[0].group_id, result.rows[0].event_time, parsedEvent);
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
            [groupID, transactionID]
        );

        return databaseRowToTransaction(result.rows[0]);
    }
}

export async function getTransactionsPositionsForGroup(groupID: number): Promise<TransactionPosition[]> {
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
             and t.group_id = ?1`,
        [groupID]
    );

    const serverPositions = result.rows.map((row) => databaseRowToPosition(row));

    const localPositionsQueryResult = await db.execute(
        `select *
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
            sub.rank = 1`,
        [groupID]
    );
    const localPositions = localPositionsQueryResult.rows.map((row) =>
        transactionPositionFromEvent(
            row.position_id,
            row.transaction_id,
            row.group_id,
            row.event_time,
            JSON.parse(row.event_content)
        )
    );

    return localPositions.concat(...serverPositions);
}

export async function getTransactionsPositions(transactionID: number): Promise<TransactionPosition[]> {
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
             and t.transaction_id = ?1`,
        [transactionID]
    );

    const serverPositions = result.rows.map((row) => databaseRowToPosition(row));

    const localPositionsQueryResult = await db.execute(
        `select *
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
            sub.rank = 1`,
        [transactionID]
    );
    const localPositions = localPositionsQueryResult.rows.map((row) =>
        transactionPositionFromEvent(
            row.position_id,
            row.transaction_id,
            row.group_id,
            row.event_time,
            JSON.parse(row.event_content)
        )
    );

    return localPositions.concat(...serverPositions);
}

export async function pushLocalTransactionChanges(
    transactionID: number
): Promise<[TransactionDetails, TransactionPosition[]]> {
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
                pending_transaction_changes pac
            where
                transaction_id = ?1
            order by
                event_time desc
            limit 1`,
            [transactionID]
        );
        const positionQueryResult = await conn.execute(
            `select *
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
                sub.rank = 1`,
            [transactionID]
        );
        if (transactionQueryResult.rows.length === 0 && positionQueryResult.rows.length === 0) {
            return;
        }

        const positions = positionQueryResult.rows.map((row) =>
            transactionPositionFromEvent(
                row.position_id,
                row.transaction_id,
                row.group_id,
                row.event_time,
                JSON.parse(row.event_content)
            )
        );

        let updatedTransaction: TransactionDetails, updatedPositions: TransactionPosition[];

        if (transactionQueryResult.rows.length > 0) {
            console.log("pushing transaction detail plus position changes to server");
            const t = transactionQueryResult.rows[0];
            const transaction = transactionFromEvent(
                t.transaction_id,
                t.group_id,
                t.event_time,
                JSON.parse(t.event_content)
            );
            [updatedTransaction, updatedPositions] = await api.pushTransactionChanges(transaction, positions, true);
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
            [updatedTransaction, updatedPositions] = await api.pushTransactionPositionChanges(
                transactionID,
                positions,
                true
            );
        }
        await saveTransactionToDatabase(updatedTransaction, updatedPositions, conn);
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
            groupID: updatedTransaction.groupID,
        });
        transactionPositionNotifier.emit("changed", {
            groupID: updatedTransaction.groupID,
            transactionID: transactionID,
        });
        if (updatedTransaction.id !== transactionID) {
            transactionPositionNotifier.emit("changed", {
                groupID: updatedTransaction.groupID,
                transactionID: transactionID,
            });
        }

        return [updatedTransaction, updatedPositions];
    });
}

export async function updateTransaction(transaction: TransactionDetails) {
    const validationErrors = validateTransactionDetails(transaction);
    if (Object.keys(validationErrors).length > 0) {
        throw new ValidationError(validationErrors);
    }

    console.log("saving local transaction changes");
    const eventPayload: Partial<TransactionEventPayload> = {
        description: transaction.description,
        value: transaction.value,
        currencySymbol: transaction.currencySymbol,
        currencyConversionRate: transaction.currencyConversionRate,
        billedAt: toISODateString(transaction.billedAt),
        creditorShares: transaction.creditorShares,
        debitorShares: transaction.debitorShares,
        deleted: transaction.deleted,
    };
    return await db.transaction(async (conn: Connection) => {
        // get previous pending change
        const previous = await conn.execute(
            `select *
            from
                pending_transaction_changes
            where
                transaction_id = ?1
            order by
                event_time desc
            limit 1`,
            [transaction.id]
        );

        const updatedPayload =
            previous.rows.length > 0
                ? { ...JSON.parse(previous.rows[0].event_content), ...eventPayload }
                : eventPayload;

        await conn.execute(
            `insert into pending_transaction_changes (
                transaction_id, group_id, event_content, event_time
            )
             values (
                 ?, ?, ?, ?
             )`,
            [transaction.id, transaction.groupID, JSON.stringify(updatedPayload), new Date().toISOString()]
        );
        transactionNotifier.emit("changed", { groupID: transaction.groupID, transactionID: transaction.id });
    });
}

export async function createTransaction(groupID: number, type: TransactionType): Promise<[number, Date]> {
    const eventPayload = {
        type: type,
        groupID: groupID,
        value: 0,
        billedAt: toISODateString(new Date()),
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
                coalesce(min(pac.transaction_id), -1) as curr_min_id
            from
                pending_transaction_changes pac
            where
                pac.group_id = ?`,
            [groupID]
        );
        const nextID = Math.min(res.rows[0].curr_min_id, 0) - 1;
        const creationDate = new Date();
        await conn.execute(
            `insert into pending_transaction_changes (
                transaction_id, group_id, event_content, event_time
            )
            values (
                ?, ?, ?, ?
            )`,
            [nextID, groupID, JSON.stringify(eventPayload), creationDate.toISOString()]
        );
        transactionNotifier.emit("changed", { groupID: groupID });
        return [nextID, creationDate];
    });
}

export async function deleteTransaction(groupID: number, transactionID: number) {
    if (transactionID < 0) {
        return await deleteLocalTransactionChanges(groupID, transactionID);
    }

    const transaction = await getTransaction(groupID, transactionID);
    transaction.deleted = true;
    return await updateTransaction(transaction);
}

export async function deleteLocalTransactionChanges(
    groupID: number,
    transactionID: number,
    olderThan?: string
): Promise<boolean> {
    console.log("deleting local transaction changes to transaction", transactionID, "older than", olderThan);
    // returns true if a local only transaction was deleted fully
    return await db.transaction(async (conn: Connection) => {
        if (olderThan) {
            await conn.execute(
                `delete
                from
                    pending_transaction_changes
                where
                    transaction_id = ?1
                    and event_time >= ?2`,
                [transactionID, olderThan]
            );
            await conn.execute(
                `delete
                from
                    pending_transaction_position_changes
                where
                    transaction_id = ?1
                    and event_time >= ?2`,
                [transactionID, olderThan]
            );
        } else {
            await conn.execute(
                `delete
                from
                    pending_transaction_changes
                where
                    transaction_id = ?1`,
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
        }

        transactionNotifier.emit("changed", { groupID: groupID });
        transactionPositionNotifier.emit("changed", {
            groupID: groupID,
            transactionID: transactionID,
        });

        return deletedLocalTransaction;
    });
}

export async function createPosition(
    groupID: number,
    transactionID: number,
    copyFromPosition: TransactionPosition | null = null
) {
    const eventPayload = {
        transactionID: transactionID,
        name: copyFromPosition?.name ?? "",
        price: copyFromPosition?.price ?? 0,
        communistShares: copyFromPosition?.communistShares ?? 0,
        usages: copyFromPosition?.usages ?? {},
        deleted: false,
    };

    return await db.transaction(async (conn: Connection) => {
        const res = await conn.execute(
            `
            select
                coalesce(min(pac.position_id), -1) as curr_min_id
            from
                pending_transaction_position_changes pac
            where
                pac.transaction_id = ?
        `,
            [transactionID]
        );
        const nextID = Math.min(res.rows[0].curr_min_id, 0) - 1;
        await conn.execute(
            `
            insert into pending_transaction_position_changes (
                group_id, position_id, transaction_id, event_content, event_time
            )
            values (
                ?, ?, ?, ?, ?
            )`,
            [groupID, nextID, transactionID, JSON.stringify(eventPayload), new Date().toISOString()]
        );
        transactionPositionNotifier.emit("changed", {
            groupID: groupID,
            transactionID: transactionID,
        });
        console.log("created new local position for transaction with id", transactionID);
        return nextID;
    });
}

export async function updatePosition(position: TransactionPosition) {
    const validationErrors = validatePosition(position);
    if (validationErrors !== null) {
        throw new ValidationError(validationErrors);
    }

    const eventPayload = {
        name: position.name,
        price: position.price,
        communistShares: position.communistShares,
        usages: position.usages,
        deleted: position.deleted,
    };
    return await db.transaction(async (conn: Connection) => {
        await conn.execute(
            `insert into pending_transaction_position_changes (
                position_id, group_id, transaction_id, event_content, event_time
            )
             values (
                 ?, ?, ?, ?, ?
             )`,
            [
                position.id,
                position.groupID,
                position.transactionID,
                JSON.stringify(eventPayload),
                new Date().toISOString(),
            ]
        );
        transactionPositionNotifier.emit("changed", {
            groupID: position.groupID,
            transactionID: position.transactionID,
        });
    });
}

export async function deletePosition(position: TransactionPosition) {
    // TODO: determine if we keep around local only positions once deleted
    return await db.transaction(async (conn: Connection) => {
        const eventPayload = {
            transactionID: position.transactionID,
            name: position.name,
            price: position.price,
            communistShares: position.communistShares,
            usages: position.usages,
            deleted: true,
        };
        await conn.execute(
            `
            insert into pending_transaction_position_changes (
                position_id, group_id, transaction_id, event_content, event_time
            )
            values (
                ?, ?, ?, ?, ?
            )`,
            [
                position.id,
                position.groupID,
                position.transactionID,
                JSON.stringify(eventPayload),
                new Date().toISOString(),
            ]
        );
        transactionPositionNotifier.emit("changed", {
            groupID: position.groupID,
            transactionID: position.transactionID,
        });
    });
}
