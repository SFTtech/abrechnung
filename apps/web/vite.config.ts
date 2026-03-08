/// <reference types='vitest' />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => ({
    root: __dirname,
    cacheDir: "../../node_modules/.vite/apps/web",
    server: {
        port: 4200,
        host: "0.0.0.0",
        proxy: {
            "/api": {
                target: "http://localhost:8080",
            },
        },
    },
    preview: {
        port: 4200,
        host: "0.0.0.0",
    },
    plugins: [react(), tsconfigPaths(), checker({ typescript: { tsconfigPath: "tsconfig.app.json" } })],
    build: {
        outDir: "../../dist/apps/web",
        emptyOutDir: true,
        reportCompressedSize: true,
        commonjsOptions: {
            transformMixedEsModules: true,
        },
    },
    test: {
        watch: false,
        globals: true,
        environment: "jsdom",
        include: ["{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        reporters: ["default"],
        coverage: {
            reportsDirectory: "../../coverage/apps/web",
            provider: "v8" as const,
        },
    },
}));
