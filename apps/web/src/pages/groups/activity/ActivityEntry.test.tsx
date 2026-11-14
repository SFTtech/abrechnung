import * as React from "react";
import { defaultNS, resources } from "@abrechnung/translations";
import { createInstance } from "i18next";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vite-plus/test";
import { GroupLog } from "@/core/generated/api";
import { ActivityEntry } from "./ActivityEntry";

const i18n = createInstance();
void i18n.use(initReactI18next).init({
    lng: "en",
    ns: [defaultNS],
    defaultNS,
    resources,
    interpolation: { escapeValue: false },
});

const baseEntry: GroupLog = {
    id: 1,
    user_id: 1,
    username: "anna",
    logged_at: "2026-03-02T09:00:00Z",
    type: "group-created",
    message: "",
    affected: null,
    affected_username: null,
    transaction_id: null,
    account_id: null,
    transaction_deleted: false,
    account_deleted: false,
    data: {},
};

const render = (entry: Partial<GroupLog>) =>
    renderToStaticMarkup(
        <I18nextProvider i18n={i18n}>
            <MemoryRouter>
                <ActivityEntry groupId={7} entry={{ ...baseEntry, ...entry }} />
            </MemoryRouter>
        </I18nextProvider>
    );

describe("ActivityEntry", () => {
    it("renders a sentence with the actor", () => {
        expect(render({})).toContain("<strong>anna</strong> created the group");
    });

    it("renders the affected user", () => {
        const html = render({ type: "write-granted", affected_username: "ben" });
        expect(html).toContain("<strong>ben</strong> write permissions");
    });

    it("links transactions and shows the value", () => {
        const html = render({
            type: "transaction-created",
            transaction_id: 12,
            data: { name: "Groceries", value: 42.5, currency_identifier: "EUR", type: "purchase" },
        });
        expect(html).toContain('href="/groups/7/transactions/12"');
        expect(html).toContain("Groceries");
        expect(html).toContain("42.50");
    });

    it("does not link deleted transactions", () => {
        const html = render({
            type: "transaction-created",
            transaction_id: 12,
            transaction_deleted: true,
            data: { name: "Groceries" },
        });
        expect(html).toContain("<strong>Groceries</strong>");
        expect(html).not.toContain("href=");
    });

    it("distinguishes events from accounts and links them", () => {
        const html = render({ type: "event-created", account_id: 3, data: { name: "Trip", type: "clearing" } });
        expect(html).toContain("created the event");
        expect(html).toContain('href="/groups/7/events/3"');
    });

    it("does not link deleted accounts", () => {
        const html = render({
            type: "account-deleted",
            account_id: 3,
            account_deleted: true,
            data: { name: "Old", type: "personal" },
        });
        expect(html).toContain("<strong>Old</strong>");
        expect(html).not.toContain("href=");
    });

    it("falls back to the stored message for legacy entries", () => {
        const html = render({ type: "something-old", message: "created account Foo" });
        expect(html).toContain("created account Foo");
    });
});
