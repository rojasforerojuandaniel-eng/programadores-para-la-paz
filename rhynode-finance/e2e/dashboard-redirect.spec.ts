import { test, expect } from "@playwright/test";

test("unauthenticated access to dashboard redirects to sign-in", async ({ page }) => {
  await page.goto("/dashboard");

  await page.waitForURL("**/sign-in**", { timeout: 10000 });
  await expect(page).toHaveURL(/\/sign-in/);
});
