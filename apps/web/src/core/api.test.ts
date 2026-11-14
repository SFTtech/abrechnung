import { describe, expect, it } from "vite-plus/test";
import { serializeArrayParams } from "./api";

describe("serializeArrayParams", () => {
    it("leaves requests without array params untouched", () => {
        const args = { url: "/api/v1/x", params: { limit: 5 } };
        expect(serializeArrayParams(args)).toBe(args);
        expect(serializeArrayParams("/api/v1/x")).toBe("/api/v1/x");
    });

    it("repeats the key for array params", () => {
        expect(serializeArrayParams({ url: "/api/v1/x", params: { limit: 5, types: ["a", "b"] } })).toEqual({
            url: "/api/v1/x?types=a&types=b",
            params: { limit: 5 },
        });
    });
});
