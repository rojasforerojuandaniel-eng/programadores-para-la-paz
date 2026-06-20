/* eslint-disable no-console -- CLI script. */
import { config } from "dotenv";
import { getPrisma } from "../src/lib/prisma";

// Load .env.local (created via `vercel env pull`) so DATABASE_URL is present.
config({ path: ".env.local" });

/**
 * Resets all user-generated financial data from the database while keeping
 * logins and onboarding scaffolding intact.
 *
 * KEEP (identity / config / reference):
 *   user_profiles, organizations, organization_members, notification_preferences,
 *   currency_rates
 *
 * WIPE (user-generated content):
 *   clients, projects, invoices, invoice_items, invoice_reminders,
 *   transactions, tax_reports, bank_accounts, payment_links, payments,
 *   subscriptions, accounts, categories, budgets, goals, debts, investments,
 *   recurring_transactions, detected_subscriptions, push_subscriptions,
 *   receipts, achievements, net_worth_snapshots, user_activities, notifications,
 *   documents, import_jobs, webhook_events, integrations,
 *   split_groups, split_members, split_expenses
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/reset-user-data.ts            # dry-run
 *   npx tsx --env-file=.env.local scripts/reset-user-data.ts --confirm   # execute
 */

const WIPE_TABLES = [
  "split_expenses",
  "split_members",
  "split_groups",
  "integrations",
  "webhook_events",
  "import_jobs",
  "documents",
  "notifications",
  "user_activities",
  "net_worth_snapshots",
  "achievements",
  "receipts",
  "push_subscriptions",
  "detected_subscriptions",
  "recurring_transactions",
  "investments",
  "debts",
  "goals",
  "budgets",
  "categories",
  "accounts",
  "subscriptions",
  "payments",
  "payment_links",
  "bank_accounts",
  "tax_reports",
  "transactions",
  "invoice_reminders",
  "invoice_items",
  "invoices",
  "projects",
  "clients",
];

const KEEP_TABLES = [
  "user_profiles",
  "organizations",
  "organization_members",
  "notification_preferences",
  "currency_rates",
];

const CONFIRM = process.argv.includes("--confirm");

async function main() {
  const prisma = getPrisma();

  console.log("\n=== Rhynode user-data reset ===");
  console.log(`Mode: ${CONFIRM ? "EXECUTE (destructive)" : "DRY-RUN"}`);
  console.log(`\nKEEP (${KEEP_TABLES.length}): ${KEEP_TABLES.join(", ")}`);
  console.log(`\nWIPE (${WIPE_TABLES.length}): ${WIPE_TABLES.join(", ")}`);

  // Before counts on key tables.
  const samples = [
    "transactions",
    "accounts",
    "invoices",
    "budgets",
    "goals",
    "debts",
    "recurring_transactions",
    "user_profiles",
    "organizations",
  ];
  console.log("\nCurrent row counts:");
  for (const t of samples) {
    const count = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint FROM ${t}`,
    );
    console.log(`  ${t}: ${count[0]?.count ?? 0}`);
  }

  if (!CONFIRM) {
    console.log(
      "\nDry-run only. To actually wipe, re-run with --confirm. No rows were deleted.",
    );
    return;
  }

  console.log("\nTruncating wipe tables (RESTART IDENTITY CASCADE)...");
  const list = WIPE_TABLES.join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`,
  );

  console.log("\nAfter counts:");
  for (const t of samples) {
    const count = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint FROM ${t}`,
    );
    console.log(`  ${t}: ${count[0]?.count ?? 0}`);
  }
  console.log("\nReset complete. Logins (user_profiles, organizations) preserved.");
}

main()
  .catch((err) => {
    console.error("Reset failed:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });