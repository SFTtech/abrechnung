import { DateTime } from "luxon";

export type LogCategory = "transactions" | "accounts" | "events" | "members" | "group";

export const LOG_CATEGORIES: readonly LogCategory[] = ["transactions", "accounts", "events", "members", "group"];

// every log type known to the backend, grouped by the category it is filtered under
export const LOG_TYPES_BY_CATEGORY: Record<LogCategory, readonly string[]> = {
    transactions: ["transaction-created", "transaction-updated", "transaction-deleted"],
    accounts: ["account-created", "account-updated", "account-deleted"],
    events: ["event-created", "event-updated", "event-deleted"],
    members: ["member-joined", "member-left", "owner-granted", "owner-revoked", "write-granted", "write-revoked"],
    group: ["group-created", "group-updated", "invite-created", "invite-deleted"],
};

export const getLogCategory = (type: string): LogCategory | undefined =>
    LOG_CATEGORIES.find((category) => LOG_TYPES_BY_CATEGORY[category].includes(type));

export const getTypesForCategories = (categories: readonly LogCategory[]): string[] | undefined => {
    if (categories.length === 0) {
        return undefined;
    }
    return categories.flatMap((category) => [...LOG_TYPES_BY_CATEGORY[category]]);
};

type Dated = { logged_at: string };

export type DayGroup<T extends Dated> = {
    // start of the day in the local timezone
    day: DateTime;
    entries: T[];
};

/**
 * Groups entries by the local calendar day they were logged on.
 * Keeps the order of the passed entries, so newest first input results in newest first groups.
 */
export const groupEntriesByDay = <T extends Dated>(entries: readonly T[]): DayGroup<T>[] => {
    const groups: DayGroup<T>[] = [];
    for (const entry of entries) {
        const day = DateTime.fromISO(entry.logged_at).startOf("day");
        const last = groups.at(-1);
        if (last !== undefined && last.day.equals(day)) {
            last.entries.push(entry);
        } else {
            groups.push({ day, entries: [entry] });
        }
    }
    return groups;
};

export type RelativeDay = "today" | "yesterday" | "other";

export const getRelativeDay = (day: DateTime, now: DateTime = DateTime.now()): RelativeDay => {
    const today = now.startOf("day");
    if (day.equals(today)) {
        return "today";
    }
    if (day.equals(today.minus({ days: 1 }))) {
        return "yesterday";
    }
    return "other";
};
