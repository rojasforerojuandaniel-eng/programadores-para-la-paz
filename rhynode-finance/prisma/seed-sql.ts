import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function seed() {
  // eslint-disable-next-line no-console
  console.log("Seeding data...");

  // Organization
  const orgResult = await sql`
    INSERT INTO organizations (id, name, slug, tax_id, country, currency, timezone)
    VALUES ('demo_org_finance', 'Empresa Demo SAS', 'demo-finance', '900.123.456-7', 'CO', 'COP', 'America/Bogota')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id;
  `;
  const orgId = orgResult[0].id;

  // Clients
  const clientsResult = await sql`
    INSERT INTO clients (id, organization_id, name, email, tax_id, phone, address, city, country, status)
    VALUES
      ('client_1', ${orgId}, 'Comercializadora del Norte SAS', 'contacto@delnorte.co', '901.234.567-8', '+57 301 234 5678', 'Calle 100 # 15-23', 'Bogotá', 'CO', 'ACTIVE'),
      ('client_2', ${orgId}, 'Inversiones del Sur LTDA', 'facturacion@invsur.co', '902.345.678-9', '+57 302 345 6789', 'Carrera 7 # 32-11', 'Medellín', 'CO', 'ACTIVE'),
      ('client_3', ${orgId}, 'Global Trade México SA de CV', 'pagos@globaltrade.mx', 'GTM123456789', NULL, NULL, 'Ciudad de México', 'MX', 'ACTIVE')
    ON CONFLICT (id) DO NOTHING
    RETURNING id, name;
  `;

  const clients = clientsResult.length > 0 ? clientsResult : await sql`SELECT id, name FROM clients WHERE organization_id = ${orgId}`;

  // Bank Accounts
  const accountsResult = await sql`
    INSERT INTO bank_accounts (id, organization_id, name, bank_name, account_number, type, currency, balance, is_default)
    VALUES
      ('bank_1', ${orgId}, 'Cuenta Principal', 'Bancolombia', '****4521', 'CHECKING', 'COP', 12500000, true),
      ('bank_2', ${orgId}, 'Ahorros', 'Davivienda', '****8890', 'SAVINGS', 'COP', 3450000, false)
    ON CONFLICT (id) DO NOTHING
    RETURNING id;
  `;

  const accounts = accountsResult.length > 0 ? accountsResult : await sql`SELECT id FROM bank_accounts WHERE organization_id = ${orgId}`;

  // Invoices
  await sql`
    INSERT INTO invoices (id, organization_id, client_id, number, status, currency, subtotal, tax_rate, tax_amount, total, issue_date, due_date, paid_at)
    VALUES
      ('inv_1', ${orgId}, ${clients[0].id}, 'FAC-2026-001', 'PAID', 'COP', 5000000, 19, 950000, 5950000, '2026-05-01', '2026-05-15', '2026-05-10'),
      ('inv_2', ${orgId}, ${clients[1].id}, 'FAC-2026-002', 'SENT', 'COP', 3200000, 19, 608000, 3808000, '2026-05-10', '2026-05-25', NULL),
      ('inv_3', ${orgId}, ${clients[2].id}, 'FAC-2026-003', 'OVERDUE', 'USD', 2500, 0, 0, 2500, '2026-04-01', '2026-04-15', NULL)
    ON CONFLICT (id) DO NOTHING;
  `;

  // Invoice Items
  await sql`
    INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, tax_rate, tax_amount, total)
    VALUES
      ('item_1', 'inv_1', 'Consultoría estratégica — Q2 2026', 1, 5000000, 19, 950000, 5950000),
      ('item_2', 'inv_2', 'Desarrollo de software — Módulo ERP', 80, 40000, 19, 608000, 3808000),
      ('item_3', 'inv_3', 'Licencia anual — RHYNODE Finance Growth', 1, 2500, 0, 0, 2500)
    ON CONFLICT (id) DO NOTHING;
  `;

  // Transactions
  await sql`
    INSERT INTO transactions (id, organization_id, type, category, description, amount, currency, date, bank_account_id, invoice_id)
    VALUES
      ('tx_1', ${orgId}, 'INCOME', 'Ventas', 'Pago factura FAC-2026-001', 5950000, 'COP', '2026-05-10', ${accounts[0].id}, 'inv_1'),
      ('tx_2', ${orgId}, 'EXPENSE', 'Nómina', 'Pago nómina mayo 2026', 8500000, 'COP', '2026-05-15', ${accounts[0].id}, NULL),
      ('tx_3', ${orgId}, 'EXPENSE', 'Servicios', 'Servicios de cloud — AWS', 1200000, 'COP', '2026-05-05', ${accounts[0].id}, NULL),
      ('tx_4', ${orgId}, 'INCOME', 'Intereses', 'Intereses cuenta de ahorros', 45000, 'COP', '2026-05-01', ${accounts[1].id}, NULL)
    ON CONFLICT (id) DO NOTHING;
  `;

  // Tax Reports
  await sql`
    INSERT INTO tax_reports (id, organization_id, period, year, month, authority, type, status, due_date, filed_at, amount)
    VALUES
      ('tax_1', ${orgId}, 'MONTHLY', 2026, 5, 'DIAN', 'IVA', 'PENDING', '2026-06-20', NULL, NULL),
      ('tax_2', ${orgId}, 'MONTHLY', 2026, 4, 'DIAN', 'IVA', 'FILED', '2026-05-20', '2026-05-18', NULL),
      ('tax_3', ${orgId}, 'ANNUAL', 2025, NULL, 'DIAN', 'RENTA', 'APPROVED', '2026-04-30', '2026-04-15', NULL)
    ON CONFLICT (id) DO NOTHING;
  `;

  // Payment Links
  await sql`
    INSERT INTO payment_links (id, organization_id, name, description, amount, currency, status, url_slug, max_payments, current_payments)
    VALUES
      ('link_1', ${orgId}, 'Pago de Servicios Mensuales', 'Pago recurrente por servicios de consultoría', 500000, 'COP', 'ACTIVE', 'consultoria-mensual', 12, 3)
    ON CONFLICT (id) DO NOTHING;
  `;

  // eslint-disable-next-line no-console
  console.log("Seed completed successfully!");
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
