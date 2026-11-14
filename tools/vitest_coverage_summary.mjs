#!/usr/bin/env node
// Merge the vitest `json-summary` coverage reports of all workspace projects into one markdown table.
// Usage: node tools/vitest_coverage_summary.mjs [coverage-dir] >> "$GITHUB_STEP_SUMMARY"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.argv[2] ?? "coverage";

const collect = (dir) =>
    readdirSync(dir).flatMap((entry) => {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
            return collect(full);
        }
        return entry === "coverage-summary.json" ? [full] : [];
    });

if (!existsSync(root)) {
    console.error(`coverage directory ${root} does not exist`);
    process.exit(1);
}

const pct = (metric) => (metric.total === 0 ? "-" : `${metric.pct.toFixed(1)}%`);
const rows = collect(root)
    .toSorted()
    .map((file) => {
        const { total } = JSON.parse(readFileSync(file, "utf8"));
        const name = path.relative(root, path.dirname(file));
        return `| ${name} | ${pct(total.statements)} | ${pct(total.branches)} | ${pct(total.functions)} | ${pct(total.lines)} |`;
    });

console.log("## Frontend coverage (vitest)\n");
console.log("| Project | Statements | Branches | Functions | Lines |");
console.log("| --- | --- | --- | --- | --- |");
console.log(rows.join("\n"));
