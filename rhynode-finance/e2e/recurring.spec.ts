import { test, expect } from "@playwright/test";

test.describe("create recurring transaction", () => {
  test("creates a monthly recurring and displays it in the list", async ({ page }) => {
    const name = `E2E Recurring ${Date.now()}`;
    const amount = "49900";

    await page.goto("/dashboard/personal/recurring");

    // Open the create dialog.
    await page.getByRole("button", { name: /Nuevo Recurrente/i }).click();
    await expect(page.getByRole("heading", { name: /Nueva Transacción Recurrente/i })).toBeVisible();

    // Defaults: type EXPENSE, frequency MONTHLY, nextDueDate today — only name + amount required.
    await page.getByLabel(/Nombre \*/i).fill(name);
    await page.getByLabel(/Monto \*/i).fill(amount);

    await page.getByRole("button", { name: /^Guardar$/i }).click();

    await expect(page.getByText("Transacción recurrente creada")).toBeVisible();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // The server-rendered list should refresh and contain the new recurring item.
    await expect(page.getByRole("table").getByText(name)).toBeVisible();
  });
});