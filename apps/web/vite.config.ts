/// <reference types='vite-plus/test' />
import { defineConfig, lazyPlugins } from "vite-plus";
import react from "@vitejs/plugin-react";
import { checker } from "vite-plugin-checker";

export default defineConfig(() => ({
    root: __dirname,
    cacheDir: "../../node_modules/.vite/apps/web",
    server: {
        port: 4200,
        host: "0.0.0.0",
        proxy: {
            "/api": {
                target: process.env.ABRECHNUNG_API_URL ?? "http://localhost:8080",
            },
        },
    },
    preview: {
        port: 4200,
        host: "0.0.0.0",
    },
    resolve: {
        tsconfigPaths: true,
    },
    plugins: lazyPlugins(() => [react(), checker({ typescript: { tsconfigPath: "tsconfig.app.json" } })]),
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
            reporter: ["text-summary", "json-summary", "html"],
            include: ["src/**"],
        },
    },
}));
