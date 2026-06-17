import { test, expect } from "@playwright/test";

test("landing page loads with correct title and hero heading", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Rhynode/);

  const hero = page.getByRole("heading", {
    level: 1,
    name: /Ahorra más, cobra rápido y haz crecer tu patrimonio/,
  });
  await expect(hero).toBeVisible();
  await expect(hero).toContainText("desde una sola app");
});
