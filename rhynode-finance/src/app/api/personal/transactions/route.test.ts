import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { requireAuthFromRequest } from "@/lib/auth-from-request";
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

vi.mock("@/lib/auth-from-request", () => ({
  requireAuthFromRequest: vi.fn(),
  getBearerTokenFromRequest: vi.fn(),
  getAuthOrgFromRequest: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    account: { findUnique: vi.fn() },
    bankAccount: { findUnique: vi.fn() },
    transaction: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

const mockAuth = {
  userId: "clerk-user-1",
  profile: { id: "profile-1" },
  org: { id: "org-1" },
} as Awaited<ReturnType<typeof requireAuthFromRequest>>;

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/personal/transactions", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/personal/transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthFromRequest).mockResolvedValue(mockAuth);
  });

  it("creates a transaction when account and bank account are not provided", async () => {
    const payload = { type: "EXPENSE", description: "Coffee", amount: 5000 };
    vi.mocked(prisma.transaction.create).mockResolvedValue({ id: "tx-1", ...payload } as never);

    const response = await POST(mockRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.transaction).toMatchObject({ id: "tx-1" });
    expect(prisma.account.findUnique).not.toHaveBeenCalled();
    expect(prisma.bankAccount.findUnique).not.toHaveBeenCalled();
  });

  it("creates a transaction when account belongs to the user", async () => {
    const payload = { type: "EXPENSE", description: "Coffee", amount: 5000, accountId: "account-1" };
    vi.mocked(prisma.account.findUnique).mockResolvedValue({ id: "account-1", userId: "profile-1" } as never);
    vi.mocked(prisma.transaction.create).mockResolvedValue({ id: "tx-2", ...payload } as never);

    const response = await POST(mockRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.transaction).toMatchObject({ id: "tx-2" });
    expect(prisma.account.findUnique).toHaveBeenCalledWith({ where: { id: "account-1" } });
  });

  it("creates a transaction when bank account belongs to the organization", async () => {
    const payload = { type: "INCOME", description: "Salary", amount: 100000, bankAccountId: "bank-1" };
    vi.mocked(prisma.bankAccount.findUnique).mockResolvedValue({ id: "bank-1", organizationId: "org-1" } as never);
    vi.mocked(prisma.transaction.create).mockResolvedValue({ id: "tx-3", ...payload } as never);

    const response = await POST(mockRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.transaction).toMatchObject({ id: "tx-3" });
    expect(prisma.bankAccount.findUnique).toHaveBeenCalledWith({ where: { id: "bank-1" } });
  });

  it("returns 400 when accountId does not exist", async () => {
    const payload = { type: "EXPENSE", description: "Coffee", amount: 5000, accountId: "account-missing" };
    vi.mocked(prisma.account.findUnique).mockResolvedValue(null as never);

    const response = await POST(mockRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid account" });
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it("returns 400 when account belongs to another user", async () => {
    const payload = { type: "EXPENSE", description: "Coffee", amount: 5000, accountId: "account-other" };
    vi.mocked(prisma.account.findUnique).mockResolvedValue({ id: "account-other", userId: "profile-2" } as never);

    const response = await POST(mockRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid account" });
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it("returns 400 when bankAccountId does not exist", async () => {
    const payload = { type: "EXPENSE", description: "Coffee", amount: 5000, bankAccountId: "bank-missing" };
    vi.mocked(prisma.bankAccount.findUnique).mockResolvedValue(null as never);

    const response = await POST(mockRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid bank account" });
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it("returns 400 when bank account belongs to another organization", async () => {
    const payload = { type: "EXPENSE", description: "Coffee", amount: 5000, bankAccountId: "bank-other" };
    vi.mocked(prisma.bankAccount.findUnique).mockResolvedValue({ id: "bank-other", organizationId: "org-2" } as never);

    const response = await POST(mockRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid bank account" });
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuthFromRequest).mockResolvedValue(null);

    const response = await POST(mockRequest({ type: "EXPENSE", description: "Coffee", amount: 5000 }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when payload is invalid", async () => {
    const response = await POST(mockRequest({ type: "INVALID", description: "", amount: -1 }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid input");
  });

  it("returns 500 when Prisma throws", async () => {
    vi.mocked(prisma.transaction.create).mockRejectedValue(new Error("DB down") as never);

    const response = await POST(mockRequest({ type: "EXPENSE", description: "Coffee", amount: 5000 }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Failed to create transaction" });
  });
});

describe("GET /api/personal/transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthFromRequest).mockResolvedValue(mockAuth);
  });

  it("returns transactions for the authenticated user", async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      { id: "tx-1", description: "Coffee", amount: 5000 },
    ] as never);

    const request = new Request("http://localhost/api/personal/transactions");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.transactions).toHaveLength(1);
    expect(body.transactions[0]).toMatchObject({ id: "tx-1" });
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuthFromRequest).mockResolvedValue(null);

    const request = new Request("http://localhost/api/personal/transactions");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });
});
