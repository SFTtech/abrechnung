import { expect, test } from "@playwright/test";
import { apiLogin, E2E_USER, expectLoggedIn, login } from "./helpers";

test.describe("authentication", () => {
    test("unauthenticated users are redirected to the login page", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveURL(/\/login/);
    });

    test("login with valid credentials", async ({ page }) => {
        await login(page);
        await expectLoggedIn(page);
    });

    test("login with a wrong password keeps the user on the login page", async ({ page }) => {
        await login(page, { username: E2E_USER.username, password: "wrong-password" });
        await expect(page).toHaveURL(/\/login/);
    });

    test("logout returns to the login page", async ({ page }) => {
        await login(page);
        await expectLoggedIn(page);
        await page.goto("/logout");
        await expect(page).toHaveURL(/\/login/);
    });

    test("user is logged out automatically when the session is revoked on the backend", async ({
        page,
        request,
        baseURL,
    }) => {
        await login(page);
        await expectLoggedIn(page);

        // revoke every session of the user except the one we use for talking to the api
        const headers = await apiLogin(request, "e2e-api-session");
        const profileResp = await request.get("/api/v1/profile", { headers });
        const { sessions } = (await profileResp.json()) as { sessions: { id: number; name: string }[] };
        for (const session of sessions.filter((s) => s.name !== "e2e-api-session")) {
            // oxlint-disable-next-line no-await-in-loop
            const resp = await request.post("/api/v1/auth/delete_session", {
                headers,
                data: { session_id: session.id },
            });
            expect(resp.ok()).toBeTruthy();
        }

        // any request made by the app now yields a 401 which must log the user out
        await page.reload();
        await expect(page).toHaveURL(new RegExp(`${baseURL}/login`));
    });
});
