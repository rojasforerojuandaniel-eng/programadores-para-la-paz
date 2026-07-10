import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrganization } from "@/lib/organization.server";
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

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/organization.server", () => ({
  getCurrentOrganization: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
  prisma: {
    bankAccount: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const fakeOrg = { id: "org-1", name: "Test Org", plan: "STARTER", userId: "profile-1" };

function mockAuth(userId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
}

function mockOrg(role: "ADMIN" | "MANAGER" | "VIEWER" | null) {
  vi.mocked(getCurrentOrganization).mockResolvedValue(role ? { org: fakeOrg, role } : null);
}

function mockPostRequest(body: unknown): Request {
  return new Request("http://localhost/api/bank-accounts", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("bank-accounts route", () => {
  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      mockAuth(null);
      const response = await GET(new Request("http://localhost/api/bank-accounts"));
      const body = await response.json();
      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("returns accounts for VIEWER", async () => {
      mockAuth("user-1");
      mockOrg("VIEWER");
      const accounts = [{ id: "acc-1", organizationId: fakeOrg.id, name: "Cuenta" }];
      vi.mocked(prisma.bankAccount.findMany).mockResolvedValue(accounts as never);

      const response = await GET(new Request("http://localhost/api/bank-accounts"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.accounts).toEqual(accounts);
      expect(prisma.bankAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: fakeOrg.id } })
      );
    });

    it("returns accounts for ADMIN", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      const accounts = [{ id: "acc-1", organizationId: fakeOrg.id, name: "Cuenta" }];
      vi.mocked(prisma.bankAccount.findMany).mockResolvedValue(accounts as never);

      const response = await GET(new Request("http://localhost/api/bank-accounts"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.accounts).toEqual(accounts);
    });
  });

  describe("POST", () => {
    const validBody = {
      name: "Cuenta de ahorros",
      bankName: "Bancolombia",
      type: "SAVINGS",
      currency: "COP",
      balance: 100000,
    };

    it("returns 401 when unauthenticated", async () => {
      mockAuth(null);
      const response = await POST(mockPostRequest(validBody));
      const body = await response.json();
      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("returns 403 for VIEWER", async () => {
      mockAuth("user-1");
      mockOrg("VIEWER");
      const response = await POST(mockPostRequest(validBody));
      const body = await response.json();
      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
      expect(prisma.bankAccount.create).not.toHaveBeenCalled();
    });

    it("creates account for MANAGER", async () => {
      mockAuth("user-1");
      mockOrg("MANAGER");
      const created = {
        id: "acc-1",
        organizationId: fakeOrg.id,
        ...validBody,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.bankAccount.create).mockResolvedValue(created as never);

      const response = await POST(mockPostRequest(validBody));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.account).toEqual({
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
      expect(prisma.bankAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: fakeOrg.id,
            name: validBody.name,
            bankName: validBody.bankName,
            type: validBody.type,
            currency: validBody.currency,
            balance: validBody.balance,
          }),
        })
      );
    });

    it("creates account for ADMIN", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      const created = {
        id: "acc-1",
        organizationId: fakeOrg.id,
        ...validBody,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.bankAccount.create).mockResolvedValue(created as never);

      const response = await POST(mockPostRequest(validBody));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.account).toEqual(
        expect.objectContaining({
          organizationId: fakeOrg.id,
          name: validBody.name,
          bankName: validBody.bankName,
        })
      );
    });

    it("returns 400 for invalid input", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      const response = await POST(mockPostRequest({ name: "" }));
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid input");
      expect(prisma.bankAccount.create).not.toHaveBeenCalled();
    });
  });
});
