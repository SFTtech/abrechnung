import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => ({
    root: __dirname,
    cacheDir: "../../node_modules/.vite/libs/redux",
    plugins: [react(), tsconfigPaths()],
    test: {
        name: "test",
        watch: false,
        globals: true,
        environment: "jsdom",
        include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        reporters: ["default"],
        coverage: {
            reportsDirectory: "../../coverage/libs/redux",
            provider: "v8" as const,
        },
    },
}));
