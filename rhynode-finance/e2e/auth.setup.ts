import { expect, test as setup } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import fs from "node:fs";
import path from "node:path";

const AUTH_FILE = path.join(process.cwd(), "e2e", ".auth", "user.json");

function requireEnv() {
  const email = process.env.E2E_CLERK_EMAIL;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!email) {
    throw new Error(
      "E2E_CLERK_EMAIL is not set. Add it to .env.local to run authenticated E2E tests.",
    );
  }

  if (!secretKey) {
    throw new Error(
      "CLERK_SECRET_KEY is not set. It is required to create a Clerk sign-in token for the E2E test user.",
    );
  }

  return { email, secretKey };
}

async function selectOption(page: import("@playwright/test").Page, triggerLabel: RegExp | string, optionText: string) {
  await page.getByRole("combobox", { name: triggerLabel }).click();
  await page.getByRole("option", { name: optionText }).click();
}

async function completeOnboarding(page: import("@playwright/test").Page) {
  await expect(page).toHaveURL("/onboarding");

  // Step 1: choose mode "Ambas" so both personal and business flows are available.
  await page.getByRole("radio", { name: /Ambas/i }).click();

  const personalName = process.env.E2E_CLERK_NAME || "Usuario E2E";
  const businessName = process.env.E2E_BUSINESS_NAME || "Empresa E2E";

  await page.getByLabel(/Tu nombre/i).fill(personalName);
  await page.getByLabel(/Nombre de la empresa/i).fill(businessName);
  await selectOption(page, /País/i, "Colombia");

  // Currency and timezone are derived from the country, but wait until they are populated.
  await expect(page.getByRole("combobox", { name: /Moneda/i })).not.toHaveValue("");
  await expect(page.getByRole("combobox", { name: /Zona horaria/i })).not.toHaveValue("");

  await page.getByRole("button", { name: /Continuar/i }).click();

  // Step 2: optional goal — skip it.
  await expect(page).toHaveURL("/onboarding");
  await page.getByRole("button", { name: /Continuar/i }).click();

  // Step 3: confirm and go to dashboard.
  await expect(page.getByRole("heading", { name: /Todo listo/i })).toBeVisible();
  await page.getByRole("button", { name: /Ir al Dashboard/i }).click();

  await page.waitForURL("/dashboard/**", { timeout: 15000 });
}

setup("authenticate test user", async ({ page }) => {
  const { email } = requireEnv();

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: email });

  // After sign-in the session is active. Force navigation to dashboard so the app
  // redirects to onboarding if the account has not completed it yet.
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 15000 });

  if (page.url().includes("/onboarding")) {
    await completeOnboarding(page);
  }

  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: AUTH_FILE });
});
