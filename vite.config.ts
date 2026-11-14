// vp migrate: merged .oxlintrc.jsonc (c6ece8b64bbb6fd67645cc364b2bb304).
import { defineConfig } from "vite-plus";

export default defineConfig({
    fmt: {
        tabWidth: 4,
        singleQuote: false,
        trailingComma: "es5",
        printWidth: 120,
        ignorePatterns: ["api/*.json"],
    },
    lint: {
        plugins: ["eslint", "typescript", "oxc", "unicorn", "import", "react", "react-perf", "vitest"],
        categories: {
            correctness: "error",
            suspicious: "error",
            perf: "error",
        },
        rules: {
            "eslint/no-shadow": "off",
            "react-perf/jsx-no-jsx-as-prop": "off",
            "react-perf/jsx-no-new-object-as-prop": "off",
            "react-perf/jsx-no-new-function-as-prop": "off",
            "react-perf/jsx-no-new-array-as-prop": "off",
            "unicorn/prefer-add-event-listener": "off",
            "vite-plus/prefer-vite-plus-imports": "error",
        },
        // Type-aware linting is off to match the pre-migration oxlint setup (it surfaces ~140 new findings).
        options: {
            typeAware: false,
            typeCheck: false,
        },
        jsPlugins: [
            {
                name: "vite-plus",
                specifier: "vite-plus/oxlint-plugin",
            },
        ],
    },
});
