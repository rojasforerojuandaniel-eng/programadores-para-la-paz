import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as XLSX from "xlsx";
import { Prisma } from "@/generated/prisma/client";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { decimalToNumber } from "@/lib/decimal";
import { logger } from "@/lib/logger";
import { z } from "zod";

const querySchema = z.object({
  format: z.enum(["json", "xlsx"]),
});

const HOUR_MS = 60 * 60 * 1000;

const SHEET_NAMES: Record<string, string> = {
  organization: "Organization",
  userProfile: "User Profile",
  accounts: "Accounts",
  categories: "Categories",
  budgets: "Budgets",
  goals: "Goals",
  debts: "Debts",
  investments: "Investments",
  recurringTransactions: "Recurring Transactions",
  detectedSubscriptions: "Detected Subscriptions",
  achievements: "Achievements",
  netWorthSnapshots: "Net Worth Snapshots",
  userActivities: "User Activities",
  notifications: "Notifications",
  notificationPreferences: "Notification Preferences",
  receipts: "Receipts",
  transactions: "Transactions",
  clients: "Clients",
  projects: "Projects",
  invoices: "Invoices",
  invoiceItems: "Invoice Items",
  invoiceReminders: "Invoice Reminders",
  payments: "Payments",
  bankAccounts: "Bank Accounts",
  paymentLinks: "Payment Links",
  taxReports: "Tax Reports",
  documents: "Documents",
  organizationMembers: "Organization Members",
};

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Prisma.Decimal.isDecimal(value)) {
    return decimalToNumber(value as Prisma.Decimal);
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return value;
}

function sanitizeRow<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[key] = sanitizeValue(value);
  }
  return result;
}

function sanitizeRecord<T extends Record<string, unknown>>(
  record: T,
  omit: string[] = [],
  redact: Record<string, unknown> = {}
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (omit.includes(key)) continue;
    result[key] = key in redact ? redact[key] : value;
  }
  return sanitizeRow(result);
}

function safeSheetName(name: string): string {
  return name.slice(0, 31);
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    const clerkId = session?.userId;
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = querySchema.safeParse({
      format: searchParams.get("format") ?? undefined,
    });
    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: "Invalid or missing format", details: parsedQuery.error.flatten() },
        { status: 400 }
      );
    }
    const { format } = parsedQuery.data;

    const rateLimitResult = await rateLimit(`export:${clerkId}`, 5, HOUR_MS);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.resetAt),
          },
        }
      );
    }

    const userProfile = await getUserProfile();
    if (!userProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();

    let organization = await prisma.organization.findFirst({
      where: { slug: clerkId },
    });

    if (!organization) {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: clerkId },
        include: { organization: true },
      });
      organization = membership?.organization ?? null;
    }

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const profileId = userProfile.id;
    const organizationId = organization.id;

    const [
      accounts,
      categories,
      budgets,
      goals,
      debts,
      investments,
      recurringTransactions,
      detectedSubscriptions,
      achievements,
      netWorthSnapshots,
      userActivities,
      notifications,
      notificationPreferences,
      receipts,
      transactions,
      clients,
      projects,
      invoices,
      payments,
      bankAccounts,
      paymentLinks,
      taxReports,
      documents,
      organizationMembers,
    ] = await Promise.all([
      prisma.account.findMany({ where: { userId: profileId } }),
      prisma.category.findMany({ where: { userId: profileId } }),
      prisma.budget.findMany({ where: { userId: profileId } }),
      prisma.goal.findMany({ where: { userId: profileId } }),
      prisma.debt.findMany({ where: { userId: profileId } }),
      prisma.investment.findMany({ where: { userId: profileId } }),
      prisma.recurringTransaction.findMany({ where: { userId: profileId } }),
      prisma.detectedSubscription.findMany({ where: { userId: profileId } }),
      prisma.achievement.findMany({ where: { userId: profileId } }),
      prisma.netWorthSnapshot.findMany({ where: { userId: profileId } }),
      prisma.userActivity.findMany({ where: { userId: profileId } }),
      prisma.notification.findMany({ where: { userId: profileId } }),
      prisma.notificationPreference.findUnique({ where: { userId: profileId } }),
      prisma.receipt.findMany({ where: { userId: profileId } }),
      prisma.transaction.findMany({ where: { organizationId } }),
      prisma.client.findMany({ where: { organizationId } }),
      prisma.project.findMany({ where: { organizationId } }),
      prisma.invoice.findMany({ where: { organizationId } }),
      prisma.payment.findMany({ where: { organizationId } }),
      prisma.bankAccount.findMany({ where: { organizationId } }),
      prisma.paymentLink.findMany({ where: { organizationId } }),
      prisma.taxReport.findMany({ where: { organizationId } }),
      prisma.document.findMany({ where: { organizationId } }),
      prisma.organizationMember.findMany({ where: { organizationId } }),
    ]);

    const invoiceIds = invoices.map((invoice) => invoice.id);
    const [invoiceItems, invoiceReminders] = await Promise.all([
      invoiceIds.length > 0
        ? prisma.invoiceItem.findMany({ where: { invoiceId: { in: invoiceIds } } })
        : Promise.resolve([]),
      invoiceIds.length > 0
        ? prisma.invoiceReminder.findMany({ where: { invoiceId: { in: invoiceIds } } })
        : Promise.resolve([]),
    ]);

    const sanitizedUserProfile = sanitizeRecord(
      { ...userProfile } as Record<string, unknown>,
      ["clerkId"]
    );

    const sanitizedOrganization = sanitizeRow(organization as unknown as Record<string, unknown>);

    const sanitizedOrganizationMembers = organizationMembers.map((member) =>
      sanitizeRecord(member as Record<string, unknown>, ["userId"], { userId: "REDACTED" })
    );

    const sanitizedPayments = payments.map((payment) =>
      sanitizeRecord(payment as Record<string, unknown>, ["gatewayResponse"])
    );

    const entityArrays: Record<string, Record<string, unknown>[]> = {
      accounts: accounts.map((row) => sanitizeRow(row as Record<string, unknown>)),
      categories: categories.map((row) => sanitizeRow(row as Record<string, unknown>)),
      budgets: budgets.map((row) => sanitizeRow(row as Record<string, unknown>)),
      goals: goals.map((row) => sanitizeRow(row as Record<string, unknown>)),
      debts: debts.map((row) => sanitizeRow(row as Record<string, unknown>)),
      investments: investments.map((row) => sanitizeRow(row as Record<string, unknown>)),
      recurringTransactions: recurringTransactions.map((row) =>
        sanitizeRow(row as Record<string, unknown>)
      ),
      detectedSubscriptions: detectedSubscriptions.map((row) =>
        sanitizeRow(row as Record<string, unknown>)
      ),
      achievements: achievements.map((row) => sanitizeRow(row as Record<string, unknown>)),
      netWorthSnapshots: netWorthSnapshots.map((row) => sanitizeRow(row as Record<string, unknown>)),
      userActivities: userActivities.map((row) => sanitizeRow(row as Record<string, unknown>)),
      notifications: notifications.map((row) => sanitizeRow(row as Record<string, unknown>)),
      notificationPreferences: notificationPreferences
        ? [sanitizeRow(notificationPreferences as Record<string, unknown>)]
        : [],
      receipts: receipts.map((row) => sanitizeRow(row as Record<string, unknown>)),
      transactions: transactions.map((row) => sanitizeRow(row as Record<string, unknown>)),
      clients: clients.map((row) => sanitizeRow(row as Record<string, unknown>)),
      projects: projects.map((row) => sanitizeRow(row as Record<string, unknown>)),
      invoices: invoices.map((row) => sanitizeRow(row as Record<string, unknown>)),
      invoiceItems: invoiceItems.map((row) => sanitizeRow(row as Record<string, unknown>)),
      invoiceReminders: invoiceReminders.map((row) => sanitizeRow(row as Record<string, unknown>)),
      payments: sanitizedPayments,
      bankAccounts: bankAccounts.map((row) => sanitizeRow(row as Record<string, unknown>)),
      paymentLinks: paymentLinks.map((row) => sanitizeRow(row as Record<string, unknown>)),
      taxReports: taxReports.map((row) => sanitizeRow(row as Record<string, unknown>)),
      documents: documents.map((row) => sanitizeRow(row as Record<string, unknown>)),
      organizationMembers: sanitizedOrganizationMembers,
    };

    const timestamp = new Date().toISOString();
    const filenameBase = `rhynode-export-${organization.slug}-${timestamp}`;

    if (format === "json") {
      const exportData = {
        exportedAt: timestamp,
        format: "json" as const,
        organization: sanitizedOrganization,
        userProfile: sanitizedUserProfile,
        ...entityArrays,
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filenameBase}.json"`,
        },
      });
    }

    const workbook = XLSX.utils.book_new();

    const addSheet = (data: Record<string, unknown>[], key: string) => {
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        safeSheetName(SHEET_NAMES[key] ?? key)
      );
    };

    addSheet([sanitizedOrganization], "organization");
    addSheet([sanitizedUserProfile], "userProfile");
    Object.entries(entityArrays).forEach(([key, data]) => addSheet(data, key));

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  } catch (error) {
    logger.error("Organization export failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to export organization data" },
      { status: 500 }
    );
  }
}
