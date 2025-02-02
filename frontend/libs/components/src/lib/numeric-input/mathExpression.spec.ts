import { evaluateExpression } from "./mathExpression";

describe("mathExpressions", () => {
    test("basic operations work", () => {
        expect(evaluateExpression("(2 * 4 + 4 / 2) * 2")).toBe(20);
    });
    test("test invalid expression throws", () => {
        expect(() => evaluateExpression("(2 * 4 + 4 / 2 * 2")).toThrow();
    });
    test("advanced operations are not allowed", () => {
        expect(() => evaluateExpression("sqrt(10)")).toThrow();
    });
});
