import { test, expect } from "@playwright/test";

test("sign-in page loads and renders Clerk form", async ({ page }) => {
  await page.goto("/sign-in");

  await expect(page).toHaveTitle(/Iniciar sesión/);
  await expect(page.locator("iframe").first()).toBeVisible();
});

test("sign-up page loads and renders Clerk form", async ({ page }) => {
  await page.goto("/sign-up");

  await expect(page).toHaveTitle(/Crear cuenta/);
  await expect(page.locator("iframe").first()).toBeVisible();
});
