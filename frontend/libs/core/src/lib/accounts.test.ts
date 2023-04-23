import { Purchase, Account, AccountBalanceMap } from "@abrechnung/types";
import { computeAccountBalances, computeGroupSettlement } from "./accounts";

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

describe("computeGroupSettlement", () => {
    it("should solve a simple 3 way inequality", () => {
        const balances: AccountBalanceMap = {
            1: {
                balance: 50,
                beforeClearing: 50,
                totalConsumed: 0,
                totalPaid: 50,
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
                balance: -25,
                beforeClearing: -25,
                totalConsumed: 25,
                totalPaid: 0,
                clearingResolution: {},
            },
        };

        const settlement = computeGroupSettlement(balances);
        expect(settlement.length).toBe(2);
        expect(settlement).toContainEqual({ creditorId: 2, debitorId: 1, paymentAmount: 25 });
        expect(settlement).toContainEqual({ creditorId: 3, debitorId: 1, paymentAmount: 25 });
    });
    it("should solve a more complex group balance with matching one to one payments", () => {
        const balances: AccountBalanceMap = {
            1: {
                balance: 100,
                beforeClearing: 100,
                totalConsumed: 0,
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
                balance: -30,
                beforeClearing: -30,
                totalConsumed: 30,
                totalPaid: 0,
                clearingResolution: {},
            },
            4: {
                balance: -80,
                beforeClearing: -80,
                totalConsumed: 80,
                totalPaid: 0,
                clearingResolution: {},
            },
            5: {
                balance: 50,
                beforeClearing: 50,
                totalConsumed: 0,
                totalPaid: 50,
                clearingResolution: {},
            },
            6: {
                balance: -45,
                beforeClearing: -45,
                totalConsumed: 45,
                totalPaid: 0,
                clearingResolution: {},
            },
            7: {
                balance: 65,
                beforeClearing: 65,
                totalConsumed: 0,
                totalPaid: 65,
                clearingResolution: {},
            },
            8: {
                balance: -10,
                beforeClearing: -10,
                totalConsumed: 10,
                totalPaid: 0,
                clearingResolution: {},
            },
            9: {
                balance: -60,
                beforeClearing: -60,
                totalConsumed: 60,
                totalPaid: 0,
                clearingResolution: {},
            },
            10: {
                balance: 60,
                beforeClearing: 60,
                totalConsumed: 0,
                totalPaid: 60,
                clearingResolution: {},
            },
        };

        const settlement = computeGroupSettlement(balances);
        expect(settlement.length).toBe(7);
        expect(settlement).toContainEqual({ creditorId: 9, debitorId: 10, paymentAmount: 60 });
        expect(settlement).toContainEqual({ creditorId: 2, debitorId: 5, paymentAmount: 50 });
        expect(settlement).toContainEqual({ creditorId: 4, debitorId: 1, paymentAmount: 80 });
        expect(settlement).toContainEqual({ creditorId: 6, debitorId: 7, paymentAmount: 45 });
        expect(settlement).toContainEqual({ creditorId: 3, debitorId: 7, paymentAmount: 20 });
        expect(settlement).toContainEqual({ creditorId: 3, debitorId: 1, paymentAmount: 10 });
        expect(settlement).toContainEqual({ creditorId: 8, debitorId: 1, paymentAmount: 10 });
    });
});
