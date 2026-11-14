import { defineConfig, lazyPlugins } from "vite-plus";
import react from "@vitejs/plugin-react";

export default defineConfig(() => ({
    root: __dirname,
    cacheDir: "../../node_modules/.vite/libs/api",
    plugins: lazyPlugins(() => [react()]),
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        name: "test",
        watch: false,
        globals: true,
        environment: "jsdom",
        include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        reporters: ["default"],
        coverage: {
            reportsDirectory: "../../coverage/libs/api",
            provider: "v8" as const,
        },
    },
}));
