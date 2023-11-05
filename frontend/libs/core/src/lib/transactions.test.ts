import { Transaction, TransactionBalanceEffect, TransactionShare, TransactionType } from "@abrechnung/types";
import { computeTransactionBalanceEffect } from "./transactions";

const generateTransaction = <T extends TransactionType>(
    id: number,
    type: T,
    value: number,
    creditor_shares: TransactionShare,
    debitor_shares: TransactionShare
): Transaction => {
    return {
        id: id,
        group_id: 0,
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
        currency_conversion_rate: 1.0,
        files: {},
        file_ids: [],
        position_ids: [],
        positions: {},
        is_wip: false,
        last_changed: "2022-01-01T12:00:00",
    };
};

describe("computeAccountBalancesForTransaction", () => {
    it("should compute the balance correctly for a transaction without positions", () => {
        const t = generateTransaction(0, "purchase", 100, { 1: 1 }, { 1: 1, 2: 1, 3: 2 });
        const effect = computeTransactionBalanceEffect(t);
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
        const t = generateTransaction(0, "purchase", 100, { 1: 1 }, { 1: 1, 2: 2 });
        t.position_ids = [1, 2];
        t.positions = {
            1: {
                id: 1,
                price: 20,
                name: "item1",
                communist_shares: 0,
                usages: { 3: 1, 1: 1 },
                deleted: false,
                is_changed: false,
                only_local: false,
            },
            2: {
                id: 2,
                price: 40,
                name: "item2",
                communist_shares: 1,
                usages: { 2: 1 },
                deleted: false,
                is_changed: false,
                only_local: false,
            },
        };

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

        const effect = computeTransactionBalanceEffect(t);
        expect(effect).toStrictEqual(expectedEffect);
    });
});
