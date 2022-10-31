import { db, Connection } from "./database";
import { Account, AccountType, validateAccount, ValidationError } from "@abrechnung/types";
import { api } from "../api";
import { isOnline } from "../api";
import { fromISOString } from "@abrechnung/utils";
import { NotificationEmitter } from "@abrechnung/core";

interface AccountIdentifier {
    groupID: number;
    accountID?: number;
}

interface AccountEventMap {
    changed: AccountIdentifier;
}

export const accountNotifier = new NotificationEmitter<AccountEventMap>();

interface DatabaseRowAccount {
    id: number;
    group_id: number;
    type: AccountType;
    name: string;
    description: string;
    owning_user_id: number | null;
    clearing_shares: string | null;
    deleted: boolean;

    has_unpublished_changes: boolean;
    has_local_changes: boolean;
    last_changed: string;
}

const databaseRowToAccount = (row: DatabaseRowAccount): Account => {
    return {
        id: row.id,
        type: row.type,
        groupID: row.group_id,
        name: row.name,
        description: row.description,
        owningUserID: row.owning_user_id,
        clearingShares: row.clearing_shares ? JSON.parse(row.clearing_shares) : null,
        deleted: row.deleted,
        hasUnpublishedChanges: row.has_unpublished_changes,
        hasLocalChanges: row.has_local_changes,
        lastChanged: fromISOString(row.last_changed),
    };
};

const saveAccountToDatabase = async (account: Account, conn: Connection) => {
    await conn.execute(
        `insert into account (id, group_id, type, last_changed, has_unpublished_changes) 
        values (?1, ?2, ?3, ?4, ?5)
        on conflict (id) do nothing`,
        [account.id, account.groupID, account.type, account.hasUnpublishedChanges, account.lastChanged.toISOString()]
    );
    await conn.execute(
        `insert into account_history (
            id, "name", description, deleted, owning_user_id, clearing_shares
        )
        values (
            ?1, ?2, ?3, ?4, ?5, ?6
        )
        on conflict (id) do update set
            "name"                  = excluded.name,
            description             = excluded.description,
            deleted                 = excluded.deleted,
            owning_user_id          = excluded.owning_user_id,
            clearing_shares         = excluded.clearing_shares`,
        [
            account.id,
            account.name,
            account.description,
            account.deleted,
            account.owningUserID,
            JSON.stringify(account.clearingShares),
        ]
    );
};

export const syncAccounts = async (groupID: number): Promise<Account[]> => {
    let backendAccounts = await api.fetchAccounts(groupID);
    await db.transaction((conn: Connection) => {
        backendAccounts.forEach((account: Account) => {
            saveAccountToDatabase(account, conn);
        });
    });

    // TODO: resolve conflicts after fetching accounts
    const accounts = await getAccounts(groupID); // TODO: proper database query
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
        `select *
         from accounts_including_pending_changes
         where
             group_id = ?1`,
        [groupID]
    );

    return result.rows.map((row) => databaseRowToAccount(row as DatabaseRowAccount));
};

export const getAccount = async (group_id: number, account_id: number): Promise<Account> => {
    const result = await db.execute(
        `select *
         from accounts_including_pending_changes
         where
             group_id = ?1 and id = ?2`,
        [group_id, account_id]
    );
    return databaseRowToAccount(result.rows[0] as DatabaseRowAccount);
};

export const pushPendingAccountChanges = async (groupID: number): Promise<void> => {
    return await db.transaction(async (conn: Connection) => {
        const pendingAccounts = await conn.execute(
            `select * from last_pending_account_changes pac where group_id = ?1`,
            [groupID]
        );
        if (pendingAccounts.rows.length === 0) {
            return;
        }

        const accounts = pendingAccounts.rows.map((row) => databaseRowToAccount(row as DatabaseRowAccount));
        // TODO: implement
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
                last_pending_account_changes pac
            where
                id = ?1`,
            [accountID]
        );
        if (accountQueryResult.rows.length === 0) {
            return;
        }

        console.log("pushing transaction detail plus position changes to server");
        const account = databaseRowToAccount(accountQueryResult.rows[0] as DatabaseRowAccount);
        const updatedAccount = await api.pushAccountChanges(account);
        if (accountID < 0) {
            await conn.execute(`delete from account where id = ?1`, [accountID]);
        } else {
            await conn.execute(`delete from pending_account_changes where id = ?1`, [accountID]);
        }
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
    return await db.transaction(async (conn: Connection) => {
        const updateDate = new Date();
        await conn.execute(`update account set last_changed = ?2, has_unpublished_changes = true where id = ?1`, [
            account.id,
            updateDate.toISOString(),
        ]);
        await conn.execute(
            `insert into pending_account_changes (
                id, change_time, name, description, owning_user_id, clearing_shares, deleted
            )
             values (
                 ?1, ?2, ?3, ?4, ?5, ?6, ?7
             )`,
            [
                account.id,
                updateDate.toISOString(),
                account.name,
                account.description,
                account.owningUserID,
                JSON.stringify(account.clearingShares),
                account.deleted,
            ]
        );
        accountNotifier.emit("changed", {
            groupID: account.groupID,
            accountID: account.id,
        });
    });
};

export const createAccount = async (groupID: number, type: AccountType): Promise<[number, Date]> => {
    const account = {
        groupID: groupID,
        name: "",
        description: "",
        owningUserID: null,
        deleted: false,
        clearingShares: type === "clearing" ? {} : null,
    };

    return await db.transaction(async (conn: Connection) => {
        const res = await conn.execute(
            `select
                coalesce(min(a), 0) as curr_min_id
            from
                account a
            where id < 0`,
            []
        );
        const nextID = Math.min(res.rows[0].curr_min_id, 0) - 1;
        const creationDate = new Date();
        await conn.execute(
            `insert into account (
                id, group_id, type, has_unpublished_changes, last_changed
            )
            values (
                ?1, ?2, ?3, true, ?4
            )`,
            [nextID, groupID, type, creationDate.toISOString()]
        );
        await conn.execute(
            `insert into pending_account_changes (
                id, change_time, name, description, owning_user_id, clearing_shares, deleted
            )
             values (
                 ?1, ?2, ?3, ?4, ?5, ?6, ?7
             )`,
            [
                nextID,
                creationDate.toISOString(),
                account.name,
                account.description,
                account.owningUserID,
                JSON.stringify(account.clearingShares),
                account.deleted,
            ]
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
                    id = ?1
                    and change_time >= ?2`,
                [accountID, olderThan]
            );
        } else {
            await conn.execute(
                `delete
                from
                    pending_account_changes
                where
                    account_id = ?1`,
                [accountID]
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
            if (deletedLocalAccount) {
                await conn.execute(`delete from account where id = ?1`, [accountID]);
            }
        }

        accountNotifier.emit("changed", { groupID: groupID });

        return deletedLocalAccount;
    });
};
