import {
    Purchase,
    TransactionBalanceEffect,
    TransactionPosition,
    TransactionShare,
    TransactionType,
} from "@abrechnung/types";
import { computeTransactionBalanceEffect } from "./transactions";

const generateTransaction = <T extends TransactionType>(
    id: number,
    type: T,
    value: number,
    creditor_shares: TransactionShare,
    debitor_shares: TransactionShare
): any => {
    const t = {
        id: id,
        groupID: 0,
        billed_at: "2022-01-01",
        deleted: false,
        type: type,
        value: value,
        creditor_shares: creditor_shares,
        debitor_shares: debitor_shares,
        name: "test",
        description: "",
        tags: [],
        currency_symbol: "€",
        currencyConversionRate: 1.0,
        attachments: [],
    };
    if (type === "purchase") {
        return { ...t, positions: [] };
    } else {
        return t;
    }
};

describe("computeAccountBalancesForTransaction", () => {
    it("should compute the balance correctly for a transaction without positions", () => {
        const t = generateTransaction(0, "purchase", 100, { 1: 1 }, { 1: 1, 2: 1, 3: 2 });
        const effect = computeTransactionBalanceEffect(t, []);
        const expectedEffect: TransactionBalanceEffect = {
            1: {
                commonCreditors: 100,
                commonDebitors: 25,
                positions: 0,
                total: 75,
            },
            2: {
                commonCreditors: 0,
                commonDebitors: 25,
                positions: 0,
                total: -25,
            },
            3: {
                commonCreditors: 0,
                commonDebitors: 50,
                positions: 0,
                total: -50,
            },
        };
        expect(effect).toStrictEqual(expectedEffect);
    });

    it("should compute the balance correctly for a transaction with positions", () => {
        const t = generateTransaction(0, "purchase", 100, { 1: 1 }, { 1: 1, 2: 2 }) as Purchase;
        t.positions = [1, 2];
        const positions: TransactionPosition[] = [
            {
                id: 1,
                transactionID: 0,
                price: 20,
                name: "item1",
                communist_shares: 0,
                usages: { 3: 1, 1: 1 },
                deleted: false,
            },
            {
                id: 2,
                transactionID: 0,
                price: 40,
                name: "item2",
                communist_shares: 1,
                usages: { 2: 1 },
                deleted: false,
            },
        ];

        const expectedEffect: TransactionBalanceEffect = {
            1: {
                commonCreditors: 100,
                commonDebitors: 20,
                positions: 10,
                total: 70,
            },
            2: {
                commonCreditors: 0,
                commonDebitors: 40,
                positions: 20,
                total: -60,
            },
            3: {
                commonCreditors: 0,
                commonDebitors: 0,
                positions: 10,
                total: -10,
            },
        };

        const effect = computeTransactionBalanceEffect(t, positions);
        expect(effect).toStrictEqual(expectedEffect);
    });
});
