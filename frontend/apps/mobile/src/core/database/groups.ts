import { db } from "./index";
import NotificationTracker from "../index";
import { Group } from "@abrechnung/types";
import { fetchGroups } from "../api/groups";

export const groupNotifier = new NotificationTracker();

function databaseRowToGroup(row): Group {
    return <Group>{
        id: row.id,
        name: row.name,
        description: row.description,
        terms: row.terms,
        currency_symbol: row.currency_symbol,
        created_at: row.created_at,
        created_by: row.created_by,
        add_user_account_on_join: row.add_user_account_on_join,
    };
}

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

    return result.rows.map((row) => databaseRowToGroup(row));
}

export async function syncGroups(): Promise<Group[]> {
    const backendGroups = await fetchGroups();
    await db.transaction((conn) => {
        backendGroups.map((group) => {
            conn.execute(
                `
                insert into grp (
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
                                               add_user_account_on_join = excluded.add_user_account_on_join
            `,
                [
                    group.id,
                    group.name,
                    group.description,
                    group.terms,
                    group.currency_symbol,
                    group.created_by,
                    group.created_at,
                    group.add_user_account_on_join,
                ]
            );
        });
    });
    groupNotifier.notify("https://abrechnung.stusta.de");
    return backendGroups;
}
