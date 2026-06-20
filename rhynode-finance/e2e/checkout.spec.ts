import { test, expect } from "@playwright/test";

test.describe("public payment link /pay/[slug]", () => {
  test("renders an active link with the pay button", async ({ page, request }) => {
    const slug = `e2e-pay-${Date.now()}`;
    const linkName = `E2E Pay Link ${Date.now()}`;

    // Seed a payment link as the authenticated test user.
    const res = await request.post("/api/payment-links", {
      data: { name: linkName, amount: 75000, urlSlug: slug, currency: "COP" },
    });
    expect(res.ok()).toBe(true);
    const { link } = (await res.json()) as { link: { urlSlug: string } };
    expect(link.urlSlug).toBe(slug);

    // The public checkout page must render the link without auth.
    await page.goto(`/pay/${slug}`);
    await expect(page.getByRole("heading", { name: linkName })).toBeVisible();
    await expect(page.getByRole("button", { name: /Pagar con tarjeta/i })).toBeVisible();
  });

  test("shows not-found state for an unknown slug", async ({ page }) => {
    await page.goto(`/pay/does-not-exist-${Date.now()}`);
    await expect(page.getByText("Link no encontrado")).toBeVisible();
    await expect(page.getByRole("link", { name: /Volver al inicio/i })).toBeVisible();
  });
});