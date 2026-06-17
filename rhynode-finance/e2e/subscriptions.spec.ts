import { test, expect } from "@playwright/test";

test.describe("subscriptions page", () => {
  test("loads and shows the detect action", async ({ page }) => {
    await page.goto("/dashboard/personal/subscriptions");

    await expect(page.getByRole("heading", { name: /Suscripciones/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Detectar/i })).toBeVisible();
  });
});
