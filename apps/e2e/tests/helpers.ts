import { expect, type Page, type APIRequestContext } from "@playwright/test";

export const E2E_USER = { username: "e2e-user", password: "e2e-password-1" };

export async function login(page: Page, { username, password } = E2E_USER) {
    await page.goto("/login");
    await page.getByLabel(/username/i).fill(username);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /login|sign in/i }).click();
}

export async function expectLoggedIn(page: Page) {
    await expect(page).not.toHaveURL(/\/login/);
}

/** talk to the backend api directly, bypassing the web ui */
export async function apiLogin(request: APIRequestContext, sessionName: string) {
    const resp = await request.post("/api/v1/auth/login", {
        data: { username: E2E_USER.username, password: E2E_USER.password, session_name: sessionName },
    });
    expect(resp.ok()).toBeTruthy();
    const { access_token } = (await resp.json()) as { access_token: string };
    return { Authorization: `Bearer ${access_token}` };
}
