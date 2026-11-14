import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");
// set E2E_BACKEND_CONFIG to use a different database than the default one in config.e2e.yaml
const backendConfig = process.env.E2E_BACKEND_CONFIG ?? path.join(__dirname, "config.e2e.yaml");

export default defineConfig({
    testDir: "./tests",
    // all tests share one database, keep them sequential to avoid cross test interference
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: "http://localhost:14200",
        trace: "retain-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: [
        {
            // reset + migrate + seed the database, then start the api
            command: `uv run python apps/e2e/scripts/prepare_db.py ${backendConfig} && uv run abrechnung -c ${backendConfig} api`,
            cwd: repoRoot,
            url: "http://127.0.0.1:18080/api/v1/profile",
            // the unauthenticated profile endpoint answers with 401 once the api is up
            ignoreHTTPSErrors: true,
            reuseExistingServer: false,
            timeout: 120_000,
        },
        {
            // serves the production build, proxies /api to the backend (see apps/web/vite.config.ts)
            command: "pnpm --filter web run preview --port 14200",
            env: { ABRECHNUNG_API_URL: "http://127.0.0.1:18080" },
            cwd: repoRoot,
            url: "http://localhost:14200",
            reuseExistingServer: false,
            timeout: 60_000,
        },
    ],
});
