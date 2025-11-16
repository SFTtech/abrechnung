/// <reference types='vitest' />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import { nxCopyAssetsPlugin } from "@nx/vite/plugins/nx-copy-assets.plugin";

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
    plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(["*.md"]), checker({ typescript: true })],
    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },
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
