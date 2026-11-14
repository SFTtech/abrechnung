import { DateTime } from "luxon";
import { describe, expect, it } from "vite-plus/test";
import { getLogCategory, getRelativeDay, getTypesForCategories, groupEntriesByDay } from "./activityLog";

const at = (iso: string) => DateTime.fromISO(iso).toISO()!;

describe("activityLog", () => {
    it("maps log types to categories", () => {
        expect(getLogCategory("transaction-created")).toBe("transactions");
        expect(getLogCategory("event-updated")).toBe("events");
        expect(getLogCategory("write-revoked")).toBe("members");
        expect(getLogCategory("invite-created")).toBe("group");
        expect(getLogCategory("something-new")).toBeUndefined();
    });

    it("resolves selected categories to types, no selection means no filter", () => {
        expect(getTypesForCategories([])).toBeUndefined();
        expect(getTypesForCategories(["group"])).toEqual([
            "group-created",
            "group-updated",
            "invite-created",
            "invite-deleted",
        ]);
    });

    it("groups consecutive entries by local day and keeps order", () => {
        const entries = [
            { id: 4, logged_at: at("2026-03-02T09:00:00") },
            { id: 3, logged_at: at("2026-03-02T08:00:00") },
            { id: 2, logged_at: at("2026-03-01T23:59:00") },
            { id: 1, logged_at: at("2026-02-27T10:00:00") },
        ];
        const groups = groupEntriesByDay(entries);
        expect(groups.map((g) => g.entries.map((e) => e.id))).toEqual([[4, 3], [2], [1]]);
        expect(groups[0].day.toISODate()).toBe("2026-03-02");
    });

    it("detects today and yesterday", () => {
        const now = DateTime.fromISO("2026-03-02T12:00:00");
        expect(getRelativeDay(DateTime.fromISO("2026-03-02T00:00:00"), now)).toBe("today");
        expect(getRelativeDay(DateTime.fromISO("2026-03-01T00:00:00"), now)).toBe("yesterday");
        expect(getRelativeDay(DateTime.fromISO("2026-02-28T00:00:00"), now)).toBe("other");
    });
});
