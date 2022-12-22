import { parseSemVersion, compareSemVersion } from "./version";

describe("semver utilities", () => {
    it("should parse versions correctly", () => {
        expect(parseSemVersion("1.2.3")).toStrictEqual({ major: 1, minor: 2, patch: 3, version: "1.2.3" });
        expect(parseSemVersion("5.2.0")).toStrictEqual({ major: 5, minor: 2, patch: 0, version: "5.2.0" });

        const t1 = () => {
            parseSemVersion("1.2");
        };
        expect(t1).toThrow();
        const t2 = () => {
            parseSemVersion("1.2.5.3");
        };
        expect(t2).toThrow();
    });
    it("should compare versions correctly", () => {
        expect(compareSemVersion(parseSemVersion("1.2.3"), parseSemVersion("1.3.2"))).toBe(-1);
        expect(compareSemVersion(parseSemVersion("1.2.3"), parseSemVersion("1.2.4"))).toBe(-1);
        expect(compareSemVersion(parseSemVersion("2.2.3"), parseSemVersion("1.2.4"))).toBe(1);
        expect(compareSemVersion(parseSemVersion("3.2.1"), parseSemVersion("1.2.4"))).toBe(1);
        expect(compareSemVersion(parseSemVersion("3.2.1"), parseSemVersion("3.2.1"))).toBe(0);
    });
});
