import { test, expect } from "@playwright/test";

test.describe("create business invoice", () => {
  test("creates an invoice and displays it in the list", async ({ page }) => {
    const clientName = `E2E Client ${Date.now()}`;
    const itemDescription = `E2E Item ${Date.now()}`;
    const unitPrice = "50000";

    // Seed a client via the API so the invoice form has an option to select.
    const clientResponse = await page.request.post("/api/clients", {
      data: { name: clientName, country: "CO" },
    });
    expect(clientResponse.ok()).toBe(true);
    const { client } = (await clientResponse.json()) as { client: { id: string; name: string } };

    await page.goto("/dashboard/invoices?new=1");
    await expect(page.getByRole("heading", { name: /Nueva Factura/i })).toBeVisible();

    await page.getByRole("combobox", { name: /Cliente/i }).click();
    await page.getByRole("option", { name: client.name }).click();

    await page
      .getByRole("textbox", { name: /Descripción del ítem 1/i })
      .fill(itemDescription);
    await page
      .getByRole("spinbutton", { name: /Precio unitario del ítem 1/i })
      .fill(unitPrice);

    await page.getByRole("button", { name: /Guardar Factura/i }).click();

    await expect(page.getByText("Factura creada correctamente")).toBeVisible();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await expect(page.getByRole("table").getByText(client.name)).toBeVisible();
    await expect(page.getByRole("table").getByText(itemDescription)).toBeVisible();
  });
});
