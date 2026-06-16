import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function init() {
  console.log("Creating tables...");

  await sql`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      tax_id TEXT,
      country TEXT NOT NULL DEFAULT 'CO',
      currency TEXT NOT NULL DEFAULT 'COP',
      timezone TEXT NOT NULL DEFAULT 'America/Bogota',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      tax_id TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      currency TEXT NOT NULL DEFAULT 'COP',
      subtotal REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      issue_date TIMESTAMPTZ NOT NULL DEFAULT now(),
      due_date TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      notes TEXT,
      terms TEXT,
      dian_uuid TEXT,
      sat_uuid TEXT,
      afip_cae TEXT,
      external_id TEXT,
      config JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT,
      type TEXT NOT NULL DEFAULT 'CHECKING',
      currency TEXT NOT NULL DEFAULT 'COP',
      balance REAL NOT NULL DEFAULT 0,
      is_default BOOLEAN NOT NULL DEFAULT false,
      provider TEXT,
      external_id TEXT,
      config JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      category TEXT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'COP',
      date TIMESTAMPTZ NOT NULL DEFAULT now(),
      reference TEXT,
      bank_account_id TEXT REFERENCES bank_accounts(id) ON DELETE SET NULL,
      invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tax_reports (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      period TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER,
      quarter INTEGER,
      authority TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      due_date TIMESTAMPTZ,
      filed_at TIMESTAMPTZ,
      amount REAL,
      document_url TEXT,
      reference TEXT,
      config JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS payment_links (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'COP',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      url_slug TEXT NOT NULL UNIQUE,
      max_payments INTEGER,
      current_payments INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ,
      external_id TEXT,
      config JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      stripe_price_id TEXT,
      status TEXT NOT NULL DEFAULT 'TRIAL',
      plan TEXT NOT NULL DEFAULT 'STARTER',
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  console.log("Tables created successfully!");
}

init().catch((e) => {
  console.error(e);
  process.exit(1);
});
