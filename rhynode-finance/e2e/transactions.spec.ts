import { test, expect } from "@playwright/test";

test.describe("create personal transaction", () => {
  test("creates a transaction and displays it in the list", async ({ page }) => {
    const description = `E2E Transaction ${Date.now()}`;
    const amount = "125000";

    await page.goto("/dashboard/transactions?new=1");
    await expect(page.getByRole("heading", { name: /Nueva Transacción/i })).toBeVisible();

    // Default type is INCOME; switch to EXPENSE for a personal outflow.
    await page.getByRole("combobox", { name: /Tipo/i }).click();
    await page.getByRole("option", { name: /Gasto/i }).click();

    await page.getByLabel(/Descripción/i).fill(description);
    await page.getByLabel(/Monto/i).fill(amount);

    await page.getByRole("combobox", { name: /Categoría/i }).click();
    await page.getByRole("option", { name: /Mercado/i }).click();

    await page.getByRole("button", { name: /Guardar$/i }).click();

    await expect(page.getByText("Transacción creada correctamente")).toBeVisible();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // The server-rendered table should refresh and contain the new transaction.
    await expect(page.getByRole("table").getByText(description)).toBeVisible();
  });
});
