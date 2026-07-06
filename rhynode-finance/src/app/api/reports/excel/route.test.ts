import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import { GET } from "./route";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/with-rate-limit", () => ({
  withRateLimit: (handler: unknown) => handler,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireAuth: vi.fn(),
    getUserProfile: vi.fn(),
  };
});

vi.mock("@/lib/locale-server", () => ({
  getLocale: vi.fn().mockResolvedValue("es"),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: vi.fn(),
    },
  },
}));

type FakeTx = {
  id: string;
  organizationId: string;
  type: string;
  category: string | null;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  reference: string | null;
  scope: "PERSONAL" | "BUSINESS";
  userId: string | null;
};

function makeTx(overrides: {
  id?: string;
  description: string;
  scope: "PERSONAL" | "BUSINESS";
  userId?: string | null;
  type?: string;
  amount?: number;
  date?: Date;
}): FakeTx {
  return {
    id: overrides.id ?? `tx-${overrides.description}`,
    organizationId: "org-1",
    type: overrides.type ?? "EXPENSE",
    category: "General",
    description: overrides.description,
    amount: overrides.amount ?? 100,
    currency: "COP",
    date: overrides.date ?? new Date("2026-01-01T00:00:00.000Z"),
    reference: "",
    scope: overrides.scope,
    userId: overrides.userId ?? null,
  };
}

function matchesWhere(tx: FakeTx, where: { organizationId?: string; OR?: Array<{ scope?: string; userId?: string }> }) {
  if (where.organizationId && tx.organizationId !== where.organizationId) return false;
  if (where.OR) {
    return where.OR.some((clause) => {
      if (clause.scope && tx.scope !== clause.scope) return false;
      if (clause.userId !== undefined && tx.userId !== clause.userId) return false;
      return true;
    });
  }
  return true;
}

function createFakePrisma(store: FakeTx[]) {
  return {
    transaction: {
      findMany: vi.fn(async (args?: { where?: Parameters<typeof matchesWhere>[1]; orderBy?: unknown }) => {
        let results = store.filter((tx) => matchesWhere(tx, args?.where ?? {}));
        if (args?.orderBy && typeof args.orderBy === "object" && args.orderBy !== null && "date" in args.orderBy) {
          const dir = (args.orderBy as { date: "asc" | "desc" }).date;
          results = results.sort((a, b) =>
            dir === "asc" ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime()
          );
        }
        return results;
      }),
    },
  };
}

function mockRequest(): Request {
  return new Request("http://localhost/api/reports/excel");
}

async function sheetDescriptions(response: Response): Promise<string[]> {
  const buffer = Buffer.from(await response.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json(sheet) as Array<Record<string, unknown>>;
  return rows.map((row) => String(row["Descripción"] ?? row["Description"] ?? ""));
}

describe("GET /api/reports/excel", () => {
  const fakeOrg = { id: "org-1", name: "Org" };
  const fakeProfile = { id: "user-1", clerkId: "clerk-1", email: "a@b.co" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(fakeOrg as Awaited<ReturnType<typeof requireAuth>>);
    vi.mocked(getUserProfile).mockResolvedValue(fakeProfile as Awaited<ReturnType<typeof getUserProfile>>);
  });

  it("includes business transactions and the user's own personal transactions", async () => {
    const store = [
      makeTx({ description: "business-lunch", scope: "BUSINESS" }),
      makeTx({ description: "my-coffee", scope: "PERSONAL", userId: fakeProfile.id }),
    ];
    vi.mocked(prisma.transaction.findMany).mockImplementation(
      createFakePrisma(store).transaction.findMany as unknown as typeof prisma.transaction.findMany
    );

    const response = await GET(mockRequest());
    const descriptions = await sheetDescriptions(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("spreadsheetml.sheet");
    expect(descriptions).toContain("business-lunch");
    expect(descriptions).toContain("my-coffee");
  });

  it("excludes another member's personal transactions", async () => {
    const store = [
      makeTx({ description: "business-lunch", scope: "BUSINESS" }),
      makeTx({ description: "my-coffee", scope: "PERSONAL", userId: fakeProfile.id }),
      makeTx({ description: "other-member-secret", scope: "PERSONAL", userId: "user-2" }),
    ];
    vi.mocked(prisma.transaction.findMany).mockImplementation(
      createFakePrisma(store).transaction.findMany as unknown as typeof prisma.transaction.findMany
    );

    const response = await GET(mockRequest());
    const descriptions = await sheetDescriptions(response);

    expect(descriptions).toContain("business-lunch");
    expect(descriptions).toContain("my-coffee");
    expect(descriptions).not.toContain("other-member-secret");
  });

  it("returns 401 when organization auth fails", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null);

    const response = await GET(mockRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it("returns 401 when user profile cannot be resolved", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(null);

    const response = await GET(mockRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
  });
});
