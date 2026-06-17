import { prisma } from "@/lib/prisma";

async function seed() {
  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: "demo-finance" },
    update: {},
    create: {
      id: "demo_org_finance",
      name: "Demo Finance",
      slug: "demo-finance",
      taxId: "900.123.456-7",
      country: "CO",
      currency: "COP",
      timezone: "America/Bogota",
    },
  });

  // Create clients
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { id: "client_1" },
      update: {},
      create: {
        id: "client_1",
        organizationId: org.id,
        name: "Comercializadora del Norte SAS",
        email: "contacto@delnorte.co",
        taxId: "901.234.567-8",
        phone: "+57 301 234 5678",
        address: "Calle 100 # 15-23",
        city: "Bogotá",
        country: "CO",
      },
    }),
    prisma.client.upsert({
      where: { id: "client_2" },
      update: {},
      create: {
        id: "client_2",
        organizationId: org.id,
        name: "Inversiones del Sur LTDA",
        email: "facturacion@invsur.co",
        taxId: "902.345.678-9",
        phone: "+57 302 345 6789",
        address: "Carrera 7 # 32-11",
        city: "Medellín",
        country: "CO",
      },
    }),
    prisma.client.upsert({
      where: { id: "client_3" },
      update: {},
      create: {
        id: "client_3",
        organizationId: org.id,
        name: "Global Trade México SA de CV",
        email: "pagos@globaltrade.mx",
        taxId: "GTM123456789",
        city: "Ciudad de México",
        country: "MX",
      },
    }),
  ]);

  // Create bank accounts
  const accounts = await Promise.all([
    prisma.bankAccount.upsert({
      where: { id: "bank_1" },
      update: {},
      create: {
        id: "bank_1",
        organizationId: org.id,
        name: "Cuenta Principal",
        bankName: "Bancolombia",
        accountNumber: "****4521",
        type: "CHECKING",
        currency: "COP",
        balance: 12500000,
        isDefault: true,
      },
    }),
    prisma.bankAccount.upsert({
      where: { id: "bank_2" },
      update: {},
      create: {
        id: "bank_2",
        organizationId: org.id,
        name: "Ahorros",
        bankName: "Davivienda",
        accountNumber: "****8890",
        type: "SAVINGS",
        currency: "COP",
        balance: 3450000,
      },
    }),
  ]);

  // Create invoices
  const invoices = await Promise.all([
    prisma.invoice.upsert({
      where: { id: "inv_1" },
      update: {},
      create: {
        id: "inv_1",
        organizationId: org.id,
        clientId: clients[0].id,
        number: "FAC-2026-001",
        status: "PAID",
        currency: "COP",
        subtotal: 5000000,
        taxRate: 19,
        taxAmount: 950000,
        total: 5950000,
        issueDate: new Date("2026-05-01"),
        dueDate: new Date("2026-05-15"),
        paidAt: new Date("2026-05-10"),
        items: {
          create: [
            {
              description: "Consultoría estratégica — Q2 2026",
              quantity: 1,
              unitPrice: 5000000,
              taxRate: 19,
              taxAmount: 950000,
              total: 5950000,
            },
          ],
        },
      },
    }),
    prisma.invoice.upsert({
      where: { id: "inv_2" },
      update: {},
      create: {
        id: "inv_2",
        organizationId: org.id,
        clientId: clients[1].id,
        number: "FAC-2026-002",
        status: "SENT",
        currency: "COP",
        subtotal: 3200000,
        taxRate: 19,
        taxAmount: 608000,
        total: 3808000,
        issueDate: new Date("2026-05-10"),
        dueDate: new Date("2026-05-25"),
        items: {
          create: [
            {
              description: "Desarrollo de software — Módulo ERP",
              quantity: 80,
              unitPrice: 40000,
              taxRate: 19,
              taxAmount: 608000,
              total: 3808000,
            },
          ],
        },
      },
    }),
    prisma.invoice.upsert({
      where: { id: "inv_3" },
      update: {},
      create: {
        id: "inv_3",
        organizationId: org.id,
        clientId: clients[2].id,
        number: "FAC-2026-003",
        status: "OVERDUE",
        currency: "USD",
        subtotal: 2500,
        taxRate: 0,
        taxAmount: 0,
        total: 2500,
        issueDate: new Date("2026-04-01"),
        dueDate: new Date("2026-04-15"),
        items: {
          create: [
            {
              description: "Licencia anual — RHYNODE Finance Growth",
              quantity: 1,
              unitPrice: 2500,
              taxRate: 0,
              taxAmount: 0,
              total: 2500,
            },
          ],
        },
      },
    }),
  ]);

  // Create transactions
  await Promise.all([
    prisma.transaction.upsert({
      where: { id: "tx_1" },
      update: {},
      create: {
        id: "tx_1",
        organizationId: org.id,
        type: "INCOME",
        category: "Ventas",
        description: "Pago factura FAC-2026-001",
        amount: 5950000,
        currency: "COP",
        date: new Date("2026-05-10"),
        bankAccountId: accounts[0].id,
        invoiceId: invoices[0].id,
      },
    }),
    prisma.transaction.upsert({
      where: { id: "tx_2" },
      update: {},
      create: {
        id: "tx_2",
        organizationId: org.id,
        type: "EXPENSE",
        category: "Nómina",
        description: "Pago nómina mayo 2026",
        amount: 8500000,
        currency: "COP",
        date: new Date("2026-05-15"),
        bankAccountId: accounts[0].id,
      },
    }),
    prisma.transaction.upsert({
      where: { id: "tx_3" },
      update: {},
      create: {
        id: "tx_3",
        organizationId: org.id,
        type: "EXPENSE",
        category: "Servicios",
        description: "Servicios de cloud — AWS",
        amount: 1200000,
        currency: "COP",
        date: new Date("2026-05-05"),
        bankAccountId: accounts[0].id,
      },
    }),
    prisma.transaction.upsert({
      where: { id: "tx_4" },
      update: {},
      create: {
        id: "tx_4",
        organizationId: org.id,
        type: "INCOME",
        category: "Intereses",
        description: "Intereses cuenta de ahorros",
        amount: 45000,
        currency: "COP",
        date: new Date("2026-05-01"),
        bankAccountId: accounts[1].id,
      },
    }),
  ]);

  // Create tax reports
  await Promise.all([
    prisma.taxReport.upsert({
      where: { id: "tax_1" },
      update: {},
      create: {
        id: "tax_1",
        organizationId: org.id,
        period: "MONTHLY",
        year: 2026,
        month: 5,
        authority: "DIAN",
        type: "IVA",
        status: "PENDING",
        dueDate: new Date("2026-06-20"),
      },
    }),
    prisma.taxReport.upsert({
      where: { id: "tax_2" },
      update: {},
      create: {
        id: "tax_2",
        organizationId: org.id,
        period: "MONTHLY",
        year: 2026,
        month: 4,
        authority: "DIAN",
        type: "IVA",
        status: "FILED",
        dueDate: new Date("2026-05-20"),
        filedAt: new Date("2026-05-18"),
      },
    }),
    prisma.taxReport.upsert({
      where: { id: "tax_3" },
      update: {},
      create: {
        id: "tax_3",
        organizationId: org.id,
        period: "ANNUAL",
        year: 2025,
        authority: "DIAN",
        type: "RENTA",
        status: "APPROVED",
        dueDate: new Date("2026-04-30"),
        filedAt: new Date("2026-04-15"),
      },
    }),
  ]);

  // eslint-disable-next-line no-console
  console.log("Seed completed successfully");
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
