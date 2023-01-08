import { Purchase, Account, AccountBalanceMap } from "@abrechnung/types";
import { computeAccountBalances } from "./accounts";

const purchaseTemplate = {
    groupID: 0,
    type: "purchase" as const,
    billedAt: "2022-10-10",
    currencyConversionRate: 1.0,
    currencySymbol: "€",
    name: "foobar",
    description: "",
    deleted: false,
    attachments: [],
    tags: [],
    positions: [],
    hasLocalChanges: false,
    lastChanged: new Date().toISOString(),
    isWip: false,
};

const accountTemplate = {
    name: "foobar",
    groupID: 0,
    description: "",
    deleted: false,
    hasLocalChanges: false,
    lastChanged: new Date().toISOString(),
    isWip: false,
};

const clearingAccountTemplate = {
    ...accountTemplate,
    type: "clearing" as const,
    dateInfo: "2022-01-01",
    tags: [],
};

const personalAccountTemplate = {
    ...accountTemplate,
    type: "personal" as const,
    owningUserID: null,
};

describe("computeAccountBalances", () => {
    it("should compute the correct balance for one transaction", () => {
        const t: Purchase = {
            ...purchaseTemplate,
            id: 0,
            value: 100,
            creditorShares: { 1: 1 },
            debitorShares: { 1: 1, 2: 2, 3: 1 },
        };

        const accounts: Account[] = [
            {
                ...personalAccountTemplate,
                id: 1,
            },
            {
                ...personalAccountTemplate,
                id: 2,
            },
            {
                ...personalAccountTemplate,
                id: 3,
            },
        ];

        const expectedBalances: AccountBalanceMap = {
            1: {
                balance: 75,
                beforeClearing: 75,
                totalConsumed: 25,
                totalPaid: 100,
                clearingResolution: {},
            },
            2: {
                balance: -50,
                beforeClearing: -50,
                totalConsumed: 50,
                totalPaid: 0,
                clearingResolution: {},
            },
            3: {
                balance: -25,
                beforeClearing: -25,
                totalConsumed: 25,
                totalPaid: 0,
                clearingResolution: {},
            },
        };

        const balances = computeAccountBalances(accounts, [t], {});
        expect(balances).toStrictEqual(expectedBalances);
    });

    it("should compute the correct balance for one transactions and a clearing account", () => {
        const t: Purchase = {
            ...purchaseTemplate,
            id: 0,
            value: 100,
            creditorShares: { 1: 1 },
            debitorShares: { 1: 1, 2: 1, 4: 2 },
        };

        const accounts: Account[] = [
            {
                ...personalAccountTemplate,
                id: 1,
            },
            {
                ...personalAccountTemplate,
                id: 2,
            },
            {
                ...personalAccountTemplate,
                id: 3,
            },
            {
                ...clearingAccountTemplate,
                id: 4,
                clearingShares: { 3: 1 },
            },
        ];

        const expectedBalances: AccountBalanceMap = {
            1: {
                balance: 75,
                beforeClearing: 75,
                totalConsumed: 25,
                totalPaid: 100,
                clearingResolution: {},
            },
            2: {
                balance: -25,
                beforeClearing: -25,
                totalConsumed: 25,
                totalPaid: 0,
                clearingResolution: {},
            },
            3: {
                balance: -50,
                beforeClearing: 0,
                totalConsumed: 50,
                totalPaid: 0,
                clearingResolution: {},
            },
            4: {
                balance: 0,
                beforeClearing: -50,
                totalConsumed: 50,
                totalPaid: 0,
                clearingResolution: {
                    3: -50,
                },
            },
        };

        const balances = computeAccountBalances(accounts, [t], {});
        expect(balances).toStrictEqual(expectedBalances);
    });

    it("should compute the correct balance with multiple transactions and interdependent clearing accounts", () => {
        const transactions: Purchase[] = [
            {
                ...purchaseTemplate,
                id: 0,
                value: 100,
                creditorShares: { 1: 1 },
                debitorShares: { 1: 1, 2: 1, 4: 2 },
            },
            {
                ...purchaseTemplate,
                id: 1,
                value: 100,
                creditorShares: { 3: 1 },
                debitorShares: { 6: 1 },
            },
            {
                ...purchaseTemplate,
                id: 2,
                value: 100,
                creditorShares: { 2: 1 },
                debitorShares: { 5: 1, 7: 1 },
            },
        ];

        const accounts: Account[] = [
            {
                ...personalAccountTemplate,
                id: 1,
                type: "personal",
                owningUserID: null,
            },
            {
                ...personalAccountTemplate,
                id: 2,
                type: "personal",
                owningUserID: null,
            },
            {
                ...personalAccountTemplate,
                id: 3,
                type: "personal",
                owningUserID: null,
            },
            {
                ...clearingAccountTemplate,
                id: 4,
                type: "clearing",
                dateInfo: "2022-10-10",
                tags: [],
                clearingShares: { 3: 1 },
            },
            {
                ...clearingAccountTemplate,
                id: 5,
                type: "clearing",
                dateInfo: "2022-10-10",
                tags: [],
                clearingShares: { 4: 2, 1: 1, 2: 1 },
            },
            {
                ...clearingAccountTemplate,
                id: 6,
                type: "clearing",
                dateInfo: "2022-10-10",
                tags: [],
                clearingShares: { 5: 1 },
            },
            {
                ...clearingAccountTemplate,
                id: 7,
                type: "clearing",
                dateInfo: "2022-10-10",
                tags: [],
                clearingShares: {},
            },
        ];

        const expectedBalances: AccountBalanceMap = {
            1: {
                balance: 37.5,
                beforeClearing: 75,
                totalConsumed: 62.5,
                totalPaid: 100,
                clearingResolution: {},
            },
            2: {
                balance: 37.5,
                beforeClearing: 75,
                totalConsumed: 62.5,
                totalPaid: 100,
                clearingResolution: {},
            },
            3: {
                balance: -25,
                beforeClearing: 100,
                totalConsumed: 125,
                totalPaid: 100,
                clearingResolution: {},
            },
            4: {
                balance: 0,
                beforeClearing: -50,
                totalConsumed: 125,
                totalPaid: 0,
                clearingResolution: { 3: -125 },
            },
            5: {
                balance: 0,
                beforeClearing: -50,
                totalConsumed: 150,
                totalPaid: 0,
                clearingResolution: { 1: -37.5, 2: -37.5, 4: -75 },
            },
            6: {
                balance: 0,
                beforeClearing: -100,
                totalConsumed: 100,
                totalPaid: 0,
                clearingResolution: { 5: -100 },
            },
            7: {
                balance: -50,
                beforeClearing: -50,
                totalConsumed: 50,
                totalPaid: 0,
                clearingResolution: {},
            },
        };

        const balances = computeAccountBalances(accounts, transactions, {});
        expect(balances).toStrictEqual(expectedBalances);
    });

    it("should also work correctly for randomly sorted interdependent clearing accounts", () => {
        const transactions: Purchase[] = [
            {
                ...purchaseTemplate,
                id: 0,
                value: 100,
                creditorShares: { 1: 1 },
                debitorShares: { 3: 1 },
            },
        ];
        const accounts: Account[] = [
            {
                ...personalAccountTemplate,
                id: 1,
                type: "personal",
                owningUserID: null,
            },
            {
                ...personalAccountTemplate,
                id: 2,
                type: "personal",
                owningUserID: null,
            },
        ];
        const nClearingAccounts = 10;
        for (let i = 0; i < nClearingAccounts; i++) {
            accounts.push({
                ...clearingAccountTemplate,
                id: i + 3,
                type: "clearing",
                tags: [],
                dateInfo: "2022-01-01",
                clearingShares: { [i + 4]: 1 },
            });
        }
        accounts.push({
            ...clearingAccountTemplate,
            id: nClearingAccounts + 1,
            type: "clearing",
            tags: [],
            dateInfo: "2022-01-01",
            clearingShares: { 2: 1 },
        });
        const balances = computeAccountBalances(accounts, transactions, {});
        expect(balances).toHaveProperty("2");
        expect(balances[2]).toStrictEqual({
            balance: -100,
            beforeClearing: 0,
            totalConsumed: 100,
            totalPaid: 0,
            clearingResolution: {},
        });
    });
});
