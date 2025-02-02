import { create, type ConfigOptions, evaluateDependencies, factory } from "mathjs";

const config: ConfigOptions = {};

const add = (a: number, b: number) => a + b;
const subtract = (a: number, b: number) => a - b;
const multiply = (a: number, b: number) => a * b;
const divide = (a: number, b: number) => a / b;

const math = create(
    {
        evaluateDependencies,
        createAdd: factory("add", [], () => add),
        createSubtract: factory("subtract", [], () => subtract),
        createMultiply: factory("multiply", [], () => multiply),
        createDivide: factory("divide", [], () => divide),
    },
    config
);

export const evaluateExpression = (expr: string): number => {
    return math.evaluate(expr);
};
