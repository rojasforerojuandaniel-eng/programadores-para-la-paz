# Rhynode Finance — E2E Tests

This directory contains Playwright end-to-end tests for the critical user flows.

## Required environment variables

Add these to `.env.local` (or export them in your shell):

```bash
# Playwright base URL (optional, defaults to http://localhost:3000)
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Test Clerk user credentials
E2E_CLERK_EMAIL=test-user@example.com

# Clerk secret key used to create a sign-in token for the test user.
# This is the same CLERK_SECRET_KEY the app already uses.
CLERK_SECRET_KEY=sk_test_...

# Optional: friendly names used during onboarding completion
E2E_CLERK_NAME="Usuario E2E"
E2E_BUSINESS_NAME="Empresa E2E"
```

`E2E_CLERK_PASSWORD` is **not required**. Authentication is performed via a Clerk sign-in token created with `CLERK_SECRET_KEY`, which avoids automating email verification codes or CAPTCHA.

## How to run

1. Install Playwright browsers (one-time):

   ```bash
   npx playwright install chromium
   ```

2. Start the dev server (the test runner can also start it automatically):

   ```bash
   npm run dev
   ```

3. Run the E2E suite:

   ```bash
   npm run test:e2e
   ```

   Or with the UI:

   ```bash
   npm run test:e2e:ui
   ```

## Test architecture

- `auth.setup.ts` runs first as a Playwright setup project. It signs in the test
  user via Clerk and saves the browser storage state to `e2e/.auth/user.json`.
  If the account has not completed onboarding, the setup also finishes it with
  the **Ambas** scope so both personal and business flows are available.
- `landing.spec.ts`, `auth.spec.ts`, and `dashboard-redirect.spec.ts` run without
  authentication.
- `onboarding.spec.ts`, `transactions.spec.ts`, `invoices.spec.ts`, and
  `subscriptions.spec.ts` run with the saved storage state.

## Running individual specs

Because authenticated specs depend on the setup project, run them through the
authenticated project:

```bash
npx playwright test --project=authenticated e2e/transactions.spec.ts
```

## Notes / blockers

- If `E2E_CLERK_EMAIL` or `CLERK_SECRET_KEY` is missing, the setup test fails with
  a clear message and the authenticated projects are skipped.
- If the configured test user requires an email verification code on every
  sign-in, switch to a user that already has a verified email and rely on the
  Clerk sign-in token flow implemented in `auth.setup.ts`.
- The `e2e/.auth/` directory is git-ignored; the storage state is recreated on
  every run.
