import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { auth } from "@clerk/nextjs/server";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/organization.server";
import * as XLSX from "xlsx";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getUserProfile: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  prisma: {},
}));

vi.mock("@/lib/organization.server", () => ({
  getCurrentOrganization: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() =>
    Promise.resolve({ success: true, limit: 5, remaining: 4, resetAt: Date.now() + 3600000 })
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const fakeOrg = {
  id: "org-1",
  name: "Test Org",
  slug: "test-org",
  plan: "STARTER",
  userId: null,
};

const fakeProfile = {
  id: "profile-1",
  clerkId: "clerk-123",
  email: "admin@example.com",
};

function createFakePrisma(overrides: Record<string, unknown[]> = {}) {
  const store: Record<string, unknown[]> = {
    organization: [],
    account: [],
    category: [],
    budget: [],
    goal: [],
    debt: [],
    investment: [],
    recurringTransaction: [],
    detectedSubscription: [],
    achievement: [],
    netWorthSnapshot: [],
    userActivity: [],
    notification: [],
    notificationPreference: [],
    receipt: [],
    transaction: [],
    client: [],
    project: [],
    invoice: [],
    payment: [],
    bankAccount: [],
    paymentLink: [],
    taxReport: [],
    document: [],
    organizationMember: [],
    invoiceItem: [],
    invoiceReminder: [],
    ...overrides,
  };

  function matchesWhere(record: Record<string, unknown>, where: Record<string, unknown> | undefined): boolean {
    if (!where) return true;
    for (const [key, value] of Object.entries(where)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        if ("in" in value && Array.isArray(value.in)) {
          if (!value.in.includes(record[key])) return false;
          continue;
        }
      }
      if (record[key] !== value) return false;
    }
    return true;
  }

  const client = {
    organization: {
      findUnique: vi.fn(({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve((store.organization.find((r) => matchesWhere(r as Record<string, unknown>, where)) ?? null) as unknown)
      ),
    },
    account: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.account.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    category: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.category.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    budget: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.budget.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    goal: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.goal.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    debt: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.debt.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    investment: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.investment.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    recurringTransaction: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.recurringTransaction.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    detectedSubscription: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.detectedSubscription.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    achievement: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.achievement.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    netWorthSnapshot: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.netWorthSnapshot.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    userActivity: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.userActivity.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    notification: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.notification.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    notificationPreference: {
      findUnique: vi.fn(({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(store.notificationPreference.find((r) => matchesWhere(r as Record<string, unknown>, where)) ?? null)
      ),
    },
    receipt: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.receipt.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    transaction: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.transaction.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    client: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.client.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    project: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.project.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    invoice: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.invoice.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    payment: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.payment.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    bankAccount: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.bankAccount.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    paymentLink: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.paymentLink.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    taxReport: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.taxReport.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    document: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.document.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    organizationMember: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.organizationMember.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    invoiceItem: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.invoiceItem.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
    invoiceReminder: { findMany: vi.fn((args: { where?: Record<string, unknown> }) => Promise.resolve(store.invoiceReminder.filter((r) => matchesWhere(r as Record<string, unknown>, args.where)))) },
  };

  return client;
}

function buildRequest(format: "json" | "xlsx"): Request {
  return new Request(`http://localhost/api/organization/export?format=${format}`);
}

describe("GET /api/organization/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-123" } as Awaited<ReturnType<typeof auth>>);
    vi.mocked(getUserProfile).mockResolvedValue(fakeProfile as Awaited<ReturnType<typeof getUserProfile>>);
  });

  it("returns 403 for VIEWER members", async () => {
    vi.mocked(getCurrentOrganization).mockResolvedValue({ org: fakeOrg, role: "VIEWER" });

    const response = await GET(buildRequest("json"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Forbidden" });
  });

  it("returns 200 JSON for ADMIN members", async () => {
    vi.mocked(getCurrentOrganization).mockResolvedValue({ org: fakeOrg, role: "ADMIN" });
    const client = createFakePrisma({ organization: [fakeOrg] });
    vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

    const response = await GET(buildRequest("json"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.format).toBe("json");
    expect(body.organization.id).toBe(fakeOrg.id);
    expect(response.headers.get("Content-Type")).toContain("application/json");
  });

  it("returns 200 XLSX for ADMIN members", async () => {
    vi.mocked(getCurrentOrganization).mockResolvedValue({ org: fakeOrg, role: "ADMIN" });
    const client = createFakePrisma({ organization: [fakeOrg] });
    vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

    const response = await GET(buildRequest("xlsx"));
    const buffer = await response.arrayBuffer();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(buffer.byteLength).toBeGreaterThan(0);

    const workbook = XLSX.read(Buffer.from(buffer), { type: "buffer" });
    expect(workbook.SheetNames).toContain("Organization");
    expect(workbook.SheetNames).toContain("Transactions");
  });

  it("does not export PERSONAL transactions from other users", async () => {
    vi.mocked(getCurrentOrganization).mockResolvedValue({ org: fakeOrg, role: "ADMIN" });

    const businessTxn = {
      id: "txn-biz",
      organizationId: fakeOrg.id,
      userId: "user-other",
      scope: "BUSINESS",
      type: "EXPENSE",
      description: "Business lunch",
      amount: 100,
      currency: "COP",
      date: new Date("2026-01-01"),
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };

    const personalTxn = {
      id: "txn-personal",
      organizationId: fakeOrg.id,
      userId: "user-other",
      scope: "PERSONAL",
      type: "EXPENSE",
      description: "Personal coffee",
      amount: 50,
      currency: "COP",
      date: new Date("2026-01-02"),
      createdAt: new Date("2026-01-02"),
      updatedAt: new Date("2026-01-02"),
    };

    const client = createFakePrisma({
      organization: [fakeOrg],
      transaction: [businessTxn, personalTxn],
    });
    vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

    const response = await GET(buildRequest("json"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.transactions).toHaveLength(1);
    expect(body.transactions[0].id).toBe("txn-biz");
    expect(body.transactions.some((t: { id: string }) => t.id === "txn-personal")).toBe(false);

    expect(client.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: fakeOrg.id, scope: "BUSINESS" },
      })
    );
  });
});
