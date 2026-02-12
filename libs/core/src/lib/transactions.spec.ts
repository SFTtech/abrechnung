import { Transaction, TransactionBalanceEffect, TransactionShare, TransactionType } from "@abrechnung/types";
import { computeTransactionBalanceEffect, getDebitorSharesAfterSplitModeChange } from "./transactions";

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
        split_mode: "shares",
        tags: [],
        currency_identifier: "EUR",
        currency_conversion_rate: 1.0,
        files: {},
        file_ids: [],
        position_ids: [],
        positions: {},
        is_wip: false,
        last_changed: "2022-01-01T12:00:00",
    };
};

describe("computeTransactionBalanceEffect", () => {
    it("should compute the balance effect of a transfer correctly", () => {
        const t = generateTransaction(0, "transfer", 100, { 1: 1 }, { 2: 1 });
        const effect = computeTransactionBalanceEffect(t);
        const expectedEffect: TransactionBalanceEffect = {
            1: {
                commonCreditors: 100,
                commonDebitors: 0,
                positions: 0,
                total: 100,
            },
            2: {
                commonCreditors: 0,
                commonDebitors: 100,
                positions: 0,
                total: -100,
            },
        };
        expect(effect).toStrictEqual(expectedEffect);
    });

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

    it("should compute the balance correctly for a transaction with split mode percent", () => {
        const t = generateTransaction(0, "purchase", 100, { 1: 1 }, { 1: 0.25, 2: 0.25, 3: 0.5 });
        t.split_mode = "percent";
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

    it("should compute the balance correctly for a transaction with split mode absolute", () => {
        const t = generateTransaction(0, "purchase", 100, { 1: 1 }, { 1: 32, 2: 44, 3: 24 });
        t.split_mode = "percent";
        const effect = computeTransactionBalanceEffect(t);
        const expectedEffect: TransactionBalanceEffect = {
            1: {
                commonCreditors: 100,
                commonDebitors: 32,
                positions: 0,
                total: 68,
            },
            2: {
                commonCreditors: 0,
                commonDebitors: 44,
                positions: 0,
                total: -44,
            },
            3: {
                commonCreditors: 0,
                commonDebitors: 24,
                positions: 0,
                total: -24,
            },
        };
        expect(effect).toStrictEqual(expectedEffect);
    });
});

describe("getDebitorSharesAfterSplitModeChange", () => {
    it("should convert from shares to percent correctly", () => {
        const { splitMode, newDebitorShares } = getDebitorSharesAfterSplitModeChange(
            "shares",
            "percent",
            { 1: 1, 2: 2, 3: 1 },
            400
        );
        expect(splitMode).toBe("percent");
        expect(newDebitorShares).toStrictEqual({ 1: 0.25, 2: 0.5, 3: 0.25 });
    });

    it("should convert from percent to shares correctly", () => {
        const { splitMode, newDebitorShares } = getDebitorSharesAfterSplitModeChange(
            "percent",
            "shares",
            { 1: 0.2, 2: 0.3, 3: 0.5 },
            400
        );
        expect(splitMode).toBe("shares");
        expect(newDebitorShares).toStrictEqual({ 1: 2, 2: 3, 3: 5 });
    });

    it("should convert from shares to absolute correctly", () => {
        const { splitMode, newDebitorShares } = getDebitorSharesAfterSplitModeChange(
            "shares",
            "absolute",
            { 1: 1, 2: 3 },
            400
        );
        expect(splitMode).toBe("absolute");
        expect(newDebitorShares).toStrictEqual({ 1: 100, 2: 300 });
    });

    it("should convert from percent to absolute correctly", () => {
        const { splitMode, newDebitorShares } = getDebitorSharesAfterSplitModeChange(
            "percent",
            "absolute",
            { 1: 0.1, 2: 0.4, 3: 0.5 },
            500
        );
        expect(splitMode).toBe("absolute");
        expect(newDebitorShares).toStrictEqual({ 1: 50, 2: 200, 3: 250 });
    });

    it("should convert from absolute to shares correctly", () => {
        const { splitMode, newDebitorShares } = getDebitorSharesAfterSplitModeChange(
            "absolute",
            "shares",
            { 1: 150, 2: 250 },
            400
        );
        expect(splitMode).toBe("shares");
        expect(newDebitorShares).toStrictEqual({ 1: 3.75, 2: 6.25 });
    });

    it("should convert from absolute to percent correctly", () => {
        const { splitMode, newDebitorShares } = getDebitorSharesAfterSplitModeChange(
            "absolute",
            "percent",
            { 1: 80, 2: 120, 3: 200 },
            400
        );
        expect(splitMode).toBe("percent");
        expect(newDebitorShares).toStrictEqual({ 1: 0.2, 2: 0.3, 3: 0.5 });
    });

    it.each([{ mode: "absolute" }, { mode: "percent" }, { mode: "shares" }] as const)(
        "should convert from $mode to evenly correctly",
        ({ mode }) => {
            const { splitMode, newDebitorShares } = getDebitorSharesAfterSplitModeChange(
                mode,
                "evenly",
                { 1: 0.2, 2: 0.7, 3: 0.1 },
                1
            );
            expect(splitMode).toBe("shares");
            expect(newDebitorShares).toStrictEqual({ 1: 1, 2: 1, 3: 1 });
        }
    );
});
