import { test, expect } from "@playwright/test";

test.describe("onboarding flow", () => {
  test("redirects to dashboard when the test account is already onboarded", async ({ page }) => {
    await page.goto("/onboarding");

    // The onboarding middleware redirects already-onboarded users to the dashboard.
    await page.waitForURL("/dashboard", { waitUntil: "networkidle", timeout: 10000 });
    await expect(page).toHaveURL("/dashboard");
  });
});
