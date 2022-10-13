import { db } from "./index";
import { Account, AccountType, validateAccount, ValidationError } from "@abrechnung/types";
import { api } from "../api";
import { isOnline } from "../api";
import { fromISOString, toISOStringNullable } from "@abrechnung/utils";
import { Connection } from "./async_wrapper";
import { NotificationEmitter } from "@abrechnung/core";

interface AccountIdentifier {
    groupID: number;
    accountID?: number;
}

interface AccountEventMap {
    changed: AccountIdentifier;
}

export const accountNotifier = new NotificationEmitter<AccountEventMap>();

const databaseRowToAccount = (row: any): Account => {
    const parsed_event = row.event_content !== null ? JSON.parse(row.event_content) : {};
    return {
        id: row.id,
        type: row.type,
        group_id: row.group_id,
        name: row.name,
        description: row.description,
        priority: row.priority,
        owning_user_id: row.owning_user_id,
        clearing_shares: row.clearing_shares ? JSON.parse(row.clearing_shares) : null,
        deleted: row.deleted,
        revision_started_at: fromISOString(row.revision_started_at),
        revision_committed_at: fromISOString(row.revision_committed_at),
        version: row.version,
        is_wip: row.is_wip,
        last_changed:
            row.event_time !== null
                ? fromISOString(row.event_time)
                : row.revision_committed_at !== null
                ? fromISOString(row.revision_committed_at)
                : fromISOString(row.revision_started_at),
        ...parsed_event,
        has_local_changes: row.event_content !== null,
    } as Account;
};

const accountFromEvent = (account_id: number, group_id: number, event_time: string, event: object): Account => {
    return {
        id: account_id,
        groupID: group_id,
        version: 0,
        revisionStartedAt: null,
        revisionCommittedAt: null,
        lastChanged: fromISOString(event_time),
        ...event,
        hasLocalChanges: true,
    } as Account;
};

const saveAccountToDatabase = async (account: Account, conn?: Connection) => {
    const query = `
        insert into account (
            id, group_id, type, "name", description, priority, deleted, owning_user_id, revision_started_at,
            revision_committed_at, version, clearing_shares, is_wip
        )
        values (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13
        )
        on conflict (id) do update set
            group_id              = excluded.group_id,
            type                  = excluded.type,
            "name"                = excluded.name,
            description           = excluded.description,
            priority              = excluded.priority,
            deleted               = excluded.deleted,
            owning_user_id        = excluded.owning_user_id,
            revision_started_at   = excluded.revision_started_at,
            revision_committed_at = excluded.revision_committed_at,
            version               = excluded.version,
            clearing_shares       = excluded.clearing_shares,
            is_wip                = excluded.is_wip
    `;
    const queryParams = [
        account.id,
        account.groupID,
        account.type,
        account.name,
        account.description,
        account.priority,
        account.deleted,
        account.owningUserID,
        toISOStringNullable(account.revisionStartedAt),
        toISOStringNullable(account.revisionCommittedAt),
        account.version,
        JSON.stringify(account.clearingShares),
        account.isWip,
    ];
    if (conn) {
        return conn.execute(query, queryParams);
    } else {
        return db.execute(query, queryParams);
    }
};

export const syncAccounts = async (groupID: number): Promise<Account[]> => {
    let backendAccounts = await api.fetchAccounts(groupID);
    await db.transaction((conn: Connection) => {
        backendAccounts.forEach((account: Account) => {
            saveAccountToDatabase(account, conn);
        });
    });

    // TODO: resolve conflicts after fetching accounts
    const accounts = await getAccounts(groupID);
    const accountsWithLocalChanges = accounts.filter((a: Account) => a.hasLocalChanges);
    if (accountsWithLocalChanges.length > 0) {
        await api.syncAccountsBatch(groupID, accountsWithLocalChanges);
        backendAccounts = await api.fetchAccounts(groupID);
        await db.transaction(async (conn: Connection) => {
            await Promise.all(
                backendAccounts.map((account: Account) => {
                    return saveAccountToDatabase(account, conn);
                })
            );
            await conn.execute(`delete from pending_account_changes where group_id = ?1`, [groupID]);
        });
    }

    accountNotifier.emit("changed", { groupID: groupID });
    return backendAccounts;
};

export const getAccounts = async (groupID: number): Promise<Account[]> => {
    const result = await db.execute(
        `select
             a.id,
             a.group_id,
             a.type,
             a.name,
             a.description,
             a.priority,
             a.owning_user_id,
             a.deleted,
             a.revision_started_at,
             a.revision_committed_at,
             a.version,
             a.clearing_shares,
             a.is_wip,
             aggregated_events.event_time,
             aggregated_events.event_content
         from
             account a
             left outer join (
                 select *
                 from
                     (
                         select
                             row_number() over (partition by account_id order by event_id desc) as rank,
                             *
                         from
                             pending_account_changes
                         where
                             account_id >= 0
                             and group_id = ?1
                     ) sub
                 where
                     sub.rank = 1
                             ) aggregated_events
                             on aggregated_events.account_id = a.id and aggregated_events.group_id = a.group_id
         where
             a.id >= 0
             and a.group_id = ?1`,
        [groupID]
    );

    const serverAccounts = result.rows.map((row) => databaseRowToAccount(row));

    const localAccounts = (
        await db.execute(
            `select *
            from
                (
                    select
                        row_number() over (partition by account_id order by event_id desc) as rank,
                        *
                    from
                        pending_account_changes
                    where
                        account_id < 0
                        and group_id = ?1
                ) sub
            where
                sub.rank = 1`,
            [groupID]
        )
    ).rows.map((row) => accountFromEvent(row.account_id, row.group_id, row.event_time, JSON.parse(row.event_content)));

    return localAccounts.concat(...serverAccounts);
};

export const getAccount = async (group_id: number, account_id: number): Promise<Account> => {
    if (account_id < 0) {
        // we are dealing with a local only account
        const result = await db.execute(
            `select *
             from
                 (
                     select
                         row_number() over (partition by account_id order by event_id desc) as rank,
                         *
                     from
                         pending_account_changes
                     where
                         group_id = ?1
                         and account_id = ?2
                 ) sub
             where
                 sub.rank = 1`,
            [group_id, account_id]
        );
        // TODO: check empty result
        const parsedEvent = JSON.parse(result.rows[0].event_content);
        return accountFromEvent(account_id, result.rows[0].group_id, result.rows[0].event_time, parsedEvent);
    } else {
        const result = await db.execute(
            `select
                 a.id,
                 a.group_id,
                 a.type,
                 a.name,
                 a.description,
                 a.priority,
                 a.owning_user_id,
                 a.deleted,
                 a.revision_started_at,
                 a.revision_committed_at,
                 a.version,
                 a.clearing_shares,
                 a.is_wip,
                 aggregated_events.event_time,
                 aggregated_events.event_content
             from
                 account a
                 left outer join (
                     select *
                     from
                         (
                             select
                                 row_number() over (partition by account_id order by event_id desc) as rank,
                                 *
                             from
                                 pending_account_changes
                             where
                                 group_id = ?1 and account_id = ?2
                         ) sub
                     where
                         sub.rank = 1
                                 ) aggregated_events
                                 on aggregated_events.account_id = a.id and aggregated_events.group_id = a.group_id
             where
                 a.group_id = ?1
                 and a.id = ?2`,
            [group_id, account_id]
        );

        return databaseRowToAccount(result.rows[0]);
    }
};

export const pushPendingAccountChanges = async (groupID: number): Promise<void> => {
    return await db.transaction(async (conn: Connection) => {
        const pendingAccounts = await conn.execute(`select * from pending_account_changes pac where group_id = ?1`, [
            groupID,
        ]);
        if (pendingAccounts.rows.length === 0) {
            return;
        }

        const accounts = pendingAccounts.rows.map((a) =>
            accountFromEvent(a.account_id, a.group_id, a.event_time, JSON.parse(a.event_content))
        );
    });
};

export const pushLocalAccountChanges = async (accountID: number): Promise<Account> => {
    if (!(await isOnline())) {
        console.log("cannot push changes to server as we are offline");
        throw Error("Cannot push local changes to server as we are offline");
    }

    return await db.transaction(async (conn: Connection) => {
        console.log("pushing changes to server");
        // fetch the transaction and its pending position changes from the database
        const accountQueryResult = await conn.execute(
            `select *
            from
                pending_account_changes pac
            where
                account_id = ?1
            order by
                event_time desc
            limit 1`,
            [accountID]
        );
        if (accountQueryResult.rows.length === 0) {
            return;
        }

        console.log("pushing transaction detail plus position changes to server");
        const t = accountQueryResult.rows[0];
        const account = accountFromEvent(accountID, t.group_id, t.event_time, JSON.parse(t.event_content));
        const updatedAccount = await api.pushAccountChanges(account);
        await conn.execute(
            `
            delete
            from
                pending_account_changes
            where
                account_id = ?1
        `,
            [accountID]
        );
        await saveAccountToDatabase(updatedAccount, conn);
        console.log("successfully synced local changes with server and saved the result to local database");

        accountNotifier.emit("changed", {
            groupID: updatedAccount.groupID,
        });

        return updatedAccount;
    });
};

export const updateAccount = async (account: Account) => {
    const validationErrors = validateAccount(account);
    if (validationErrors !== null) {
        throw new ValidationError(validationErrors);
    }

    console.log("saving local account changes");
    const eventPayload = {
        name: account.name,
        description: account.description,
        priority: account.priority,
        owningUserID: account.owningUserID,
        deleted: account.deleted,
        clearingShares: account.clearingShares,
    };
    return await db.transaction(async (conn: Connection) => {
        const previousChanges = await conn.execute(
            `select *
            from
                (
                    select
                        row_number() over (partition by account_id order by event_id desc) as rank,
                        *
                    from
                        pending_account_changes
                    where
                        account_id = ?
                ) sub
            where
                sub.rank = 1`,
            [account.id]
        );

        const newPayload =
            previousChanges.rows.length > 0
                ? {
                      ...JSON.parse(previousChanges.rows[0].event_content),
                      ...eventPayload,
                  }
                : eventPayload;

        await conn.execute(
            `insert into pending_account_changes (
                account_id, group_id, event_content, event_time
            )
             values (
                 ?, ?, ?, ?
             )`,
            [account.id, account.groupID, JSON.stringify(newPayload), new Date().toISOString()]
        );
        accountNotifier.emit("changed", {
            groupID: account.groupID,
            accountID: account.id,
        });
    });
};

export const createAccount = async (groupID: number, type: AccountType): Promise<[number, Date]> => {
    const eventPayload = {
        type: type,
        groupID: groupID,
        name: "",
        description: "",
        priority: 0,
        owningUserID: null,
        deleted: false,
        clearingShares: type === "clearing" ? {} : null,
    };

    return await db.transaction(async (conn: Connection) => {
        const res = await conn.execute(
            `select
                coalesce(min(pac.account_id), -1) as curr_min_id
            from
                pending_account_changes pac
            where
                pac.group_id = ?`,
            [groupID]
        );
        const nextID = Math.min(res.rows[0].curr_min_id) - 1;
        const creationDate = new Date();
        await conn.execute(
            `insert into pending_account_changes (
                account_id, group_id, event_content, event_time
            )
            values (
                ?, ?, ?, ?
            )`,
            [nextID, groupID, JSON.stringify(eventPayload), creationDate.toISOString()]
        );
        accountNotifier.emit("changed", { groupID: groupID });
        return [nextID, creationDate];
    });
};

export const deleteAccount = async (groupID: number, accountID: number) => {
    if (accountID < 0) {
        return await deleteLocalAccountChanges(groupID, accountID);
    }

    const account = await getAccount(groupID, accountID);
    account.deleted = true;
    return await updateAccount(account);
};

export const deleteLocalAccountChanges = async (
    groupID: number,
    accountID: number,
    olderThan?: string
): Promise<boolean> => {
    return await db.transaction(async (conn: Connection) => {
        // TODO: only notify if we actually deleted something
        if (olderThan) {
            await conn.execute(
                `delete
                from
                    pending_account_changes
                where
                    account_id = ?1
                    and group_id = ?2
                    and event_time >= ?3`,
                [accountID, groupID, olderThan]
            );
        } else {
            await conn.execute(
                `delete
                from
                    pending_account_changes
                where
                    account_id = ?1
                    and group_id = ?2`,
                [accountID, groupID]
            );
        }
        let deletedLocalAccount = false;
        if (accountID < 0) {
            const nLocalChanges = await conn.execute(
                `select
                    count(*) as n_local_changes
                from
                    pending_account_changes
                where
                    account_id = ?1`,
                [accountID]
            );
            deletedLocalAccount = nLocalChanges.rows[0].n_local_changes === 0;
        }

        accountNotifier.emit("changed", { groupID: groupID });

        return deletedLocalAccount;
    });
};
