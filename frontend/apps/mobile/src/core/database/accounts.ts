import { db } from "./index";
import NotificationTracker from "../index";
import { Account, AccountType, validateAccount, ValidationError } from "@abrechnung/types";
import { fetchAccounts, pushAccountChanges } from "../api/accounts";
import { isOnline } from "../api";
import { fromISOString, toISOString } from "../utils";


type accountNotifierPayload = {
    group_id: number,
    account_id?: number;
}

export const accountNotifier = new NotificationTracker<accountNotifierPayload>();

function databaseRowToAccount(row): Account {
    const parsed_event = row.event_content !== null ? JSON.parse(row.event_content) : {};
    return <Account>{
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
        last_changed: row.event_time !== null ? fromISOString(row.event_time) : row.revision_committed_at !== null ? fromISOString(row.revision_committed_at) : fromISOString(row.revision_started_at),
        ...parsed_event,
        has_local_changes: row.event_content !== null,
    };
}

function accountFromEvent(account_id: number, group_id: number, event_time: string, event: object): Account {
    return <Account>{
        id: account_id,
        group_id: group_id,
        version: 0,
        revision_started_at: null,
        revision_committed_at: null,
        last_changed: fromISOString(event_time),
        ...event,
        has_local_changes: true,
    };
}

async function saveAccountToDatabase(account: Account, conn?) {
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
    const queryParams = [account.id,
        account.group_id,
        account.type,
        account.name,
        account.description,
        account.priority,
        account.deleted,
        account.owning_user_id,
        account.revision_started_at,
        account.revision_committed_at,
        account.version,
        JSON.stringify(account.clearing_shares),
        account.is_wip];
    if (conn) {
        return conn.execute(query, queryParams);
    } else {
        return db.execute(query, queryParams);
    }
}

export async function syncAccounts(groupID: number): Promise<Account[]> {
    const backendAccounts = await fetchAccounts({ groupID });
    await db.transaction((conn) => {
        backendAccounts.forEach(account => {
            saveAccountToDatabase(account, conn);
        });
    });
    // TODO: upload pending changes to server
    accountNotifier.notify(groupID, { group_id: groupID });
    return backendAccounts;
}

export async function getAccounts(group_id: number): Promise<Account[]> {
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
                             and group_id = ?
                     ) sub
                 where
                     sub.rank = 1
                             ) aggregated_events
                             on aggregated_events.account_id = a.id and aggregated_events.group_id = a.group_id
         where
             a.id >= 0
             and a.group_id = ?`
        , [group_id, group_id],
    );

    const serverAccounts = result.rows.map(row => databaseRowToAccount(row));

    const localAccounts = (await db.execute(`
                select *
                from
                    (
                        select
                            row_number() over (partition by account_id order by event_id desc) as rank,
                            *
                        from
                            pending_account_changes
                        where
                            account_id < 0
                            and group_id = ?
                    ) sub
                where
                    sub.rank = 1`
        , [group_id])).rows.map(row => accountFromEvent(row.account_id, row.group_id, row.event_time, JSON.parse(row.event_content)));

    return localAccounts.concat(...serverAccounts);
}

export async function getAccount(group_id: number, account_id: number): Promise<Account> {
    if (account_id < 0) { // we are dealing with a local only account
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
            [group_id, account_id],
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
                                 group_id = ?1 account_id = ?2
                         ) sub
                     where
                         sub.rank = 1
                                 ) aggregated_events
                                 on aggregated_events.account_id = a.id and aggregated_events.group_id = a.group_id
             where
                 a.group_id = ?1
                 and a.id = ?2`,
            [group_id, account_id],
        );

        return databaseRowToAccount(result.rows[0]);
    }
}


export async function pushLocalAccountChanges(account_id: number): Promise<Account> {
    if (!(await isOnline())) {
        console.log("cannot push changes to server as we are offline");
        throw Error("Cannot push local changes to server as we are offline");
    }

    return await db.transaction(async (conn) => {
        console.log("pushing changes to server");
        // fetch the transaction and its pending position changes from the database
        const accountQueryResult = await conn.execute(`select *
                                                       from
                                                           pending_account_changes pac
                                                       where
                                                           account_id = ?1
                                                       order by
                                                           event_time desc
                                                       limit 1`, [account_id]);
        if (accountQueryResult.rows.length === 0) {
            return;
        }

        console.log("pushing transaction detail plus position changes to server");
        const t = accountQueryResult.rows[0];
        const account = accountFromEvent(account_id, t.group_id, t.event_time, JSON.parse(t.event_content));
        const updatedAccount = await pushAccountChanges(account);
        await conn.execute(`
            delete
            from
                pending_account_changes
            where
                account_id = ?1
        `, [account_id]);
        await saveAccountToDatabase(updatedAccount, conn);
        console.log("successfully synced local changes with server and saved the result to local database");

        accountNotifier.notify(updatedAccount.group_id, {
            group_id: updatedAccount.group_id,
        });

        return updatedAccount;
    });
}

export async function updateAccount(account: Account) {
    const validationErrors = validateAccount(account);
    if (validationErrors !== null) {
        throw new ValidationError(validationErrors);
    }

    console.log("saving local account changes");
    const event_payload = {
        name: account.name,
        description: account.description,
        priority: account.priority,
        owning_user_id: account.owning_user_id,
        deleted: account.deleted,
        clearing_shares: account.clearing_shares,
    };
    return await db.transaction(async (conn) => {
        const previousChanges = await conn.execute(`
            select *
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
                sub.rank = 1
        `, [account.id]);

        const newPayload = previousChanges.rows.length > 0 ? { ...JSON.parse(previousChanges.rows[0].event_content), ...event_payload } : event_payload;

        await conn.execute(
            `insert into pending_account_changes (
                account_id, group_id, event_content, event_time
            )
             values (
                 ?, ?, ?, ?
             )`, [account.id, account.group_id, JSON.stringify(newPayload), toISOString(new Date())],
        );
        accountNotifier.notify(account.group_id, { group_id: account.group_id, account_id: account.id });
    });
}

export async function createAccount(group_id: number, type: AccountType): Promise<[number, Date]> {
    const event_payload = {
        type: type,
        group_id: group_id,
        name: "",
        description: "",
        priority: 0,
        owning_user_id: null,
        deleted: false,
        clearing_shares: type === "clearing" ? {} : null,
    };

    return await db.transaction(async (conn) => {
        const res = await conn.execute(`
            select
                coalesce(min(pac.account_id), -1) as curr_min_id
            from
                pending_account_changes pac
            where
                pac.group_id = ?
        `, [group_id]);
        const next_id = Math.min(res.rows[0].curr_min_id) - 1;
        const creationDate = new Date();
        await conn.execute(`
            insert into pending_account_changes (
                account_id, group_id, event_content, event_time
            )
            values (
                ?, ?, ?, ?
            )`, [next_id, group_id, JSON.stringify(event_payload), toISOString(creationDate)]);
        accountNotifier.notify(group_id, { group_id: group_id });
        return [next_id, creationDate];
    });
}

export async function deleteAccount(group_id: number, account_id: number) {
    if (account_id < 0) {
        return await deleteLocalAccountChanges(group_id, account_id);
    }

    let account = await getAccount(group_id, account_id);
    account.deleted = true;
    return await updateAccount(account);
}

export async function deleteLocalAccountChanges(group_id: number, account_id: number, olderThan?: string): Promise<boolean> {
    return await db.transaction(async (conn) => {
        // TODO: only notify if we actually deleted something
        if (olderThan) {
            await conn.execute(`
                delete
                from
                    pending_account_changes
                where
                    account_id = ?1
                    and group_id = ?2
                    and event_time >= ?3
            `, [account_id, group_id, olderThan]);
        } else {
            await conn.execute(`
                delete
                from
                    pending_account_changes
                where
                    account_id = ?1
                    and group_id = ?2
            `, [account_id, group_id]);
        }
        let deletedLocalAccount = false;
        if (account_id < 0) {
            const n_local_changes = await conn.execute(`select
                                                            count(*) as n_local_changes
                                                        from
                                                            pending_account_changes
                                                        where
                                                            account_id = ?1`, [account_id]);
            deletedLocalAccount = n_local_changes.rows[0].n_local_changes === 0;
        }

        accountNotifier.notify(group_id, { group_id: group_id });

        return deletedLocalAccount;
    });
}
