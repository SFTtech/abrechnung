import { db } from "./index";
import NotificationTracker from "../index";
import { Group } from "@abrechnung/types";
import { api } from "../api";
import { Connection } from "./database";

export const groupNotifier = new NotificationTracker();

interface DatabaseRowGroup {
    id: number;
    name: string;
    description: string;
    terms: string;
    currency_symbol: string;
    created_at: string;
    created_by: number;
    add_user_account_on_join: boolean;
}

const databaseRowToGroup = (row: DatabaseRowGroup): Group => {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        terms: row.terms,
        currencySymbol: row.currency_symbol,
        createdAt: row.created_at,
        createdBy: row.created_by,
        addUserAccountOnJoin: row.add_user_account_on_join,
    };
};

export async function getGroups(): Promise<Group[]> {
    const result = await db.execute(
        `select
             g.id,
             g.name,
             g.description,
             g.terms,
             g.currency_symbol,
             g.created_at,
             g.created_by,
             g.add_user_account_on_join
         from
             grp g`,
        []
    );

    return result.rows.map((row) => databaseRowToGroup(row as DatabaseRowGroup));
}

export async function syncGroups(): Promise<Group[]> {
    const backendGroups = await api.fetchGroups();
    await db.transaction((conn: Connection) => {
        backendGroups.forEach((group) => {
            conn.execute(
                `insert into grp (
                    id, "name", description, terms, currency_symbol, created_by, created_at, add_user_account_on_join
                )
                values (
                    ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8
                )
                on conflict (id) do update set
                                               "name"                   = excluded.name,
                                               description              = excluded.description,
                                               terms                    = excluded.terms,
                                               currency_symbol          = excluded.currency_symbol,
                                               created_by               = excluded.created_by,
                                               created_at               = excluded.created_at,
                                               add_user_account_on_join = excluded.add_user_account_on_join`,
                [
                    group.id,
                    group.name,
                    group.description,
                    group.terms,
                    group.currencySymbol,
                    group.createdBy,
                    group.createdAt,
                    group.addUserAccountOnJoin,
                ]
            );
        });
    });
    groupNotifier.notify("https://abrechnung.stusta.de");
    return backendGroups;
}
