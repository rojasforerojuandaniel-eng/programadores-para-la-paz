import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "./route";
import { auth } from "@clerk/nextjs/server";
import { getUserProfile } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/organization.server";
import { getPrisma } from "@/lib/prisma";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    getUserProfile: vi.fn(),
  };
});

vi.mock("@/lib/organization.server", () => ({
  getCurrentOrganization: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
}));

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

vi.mock("@/lib/audit-log", () => ({
  auditLog: vi.fn(),
}));

vi.mock("@/lib/rules-store", () => ({
  learnCategoryFromCorrection: vi.fn(),
}));

type TransactionRecord = {
  id: string;
  organizationId: string;
  userId: string | null;
  scope: string;
  type: string;
  description: string;
  amount: unknown;
  currency: string;
  category: string | null;
};

function createFakePrisma(initialTransactions: TransactionRecord[] = []) {
  const store: TransactionRecord[] = [...initialTransactions];

  const client = {
    transaction: {
      findUnique: vi.fn(({ where }: { where: Record<string, unknown> }) => {
        const match = store.find((t) =>
          Object.entries(where).every(([key, value]) => (t as Record<string, unknown>)[key] === value)
        );
        return Promise.resolve(match ?? null);
      }),
      update: vi.fn(({ where, data }: { where: Record<string, unknown>; data: Partial<TransactionRecord> }) => {
        const index = store.findIndex((t) =>
          Object.entries(where).every(([key, value]) => (t as Record<string, unknown>)[key] === value)
        );
        if (index < 0) {
          const error = new Error("Record not found");
          (error as unknown as Record<string, unknown>).code = "P2025";
          return Promise.reject(error);
        }
        store[index] = { ...store[index]!, ...data };
        return Promise.resolve(store[index]);
      }),
      delete: vi.fn(({ where }: { where: Record<string, unknown> }) => {
        const index = store.findIndex((t) =>
          Object.entries(where).every(([key, value]) => (t as Record<string, unknown>)[key] === value)
        );
        if (index < 0) {
          const error = new Error("Record not found");
          (error as unknown as Record<string, unknown>).code = "P2025";
          return Promise.reject(error);
        }
        const removed = store.splice(index, 1)[0]!;
        return Promise.resolve(removed);
      }),
    },
  };

  return { client, store };
}

function mockAuth(clerkUserId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId: clerkUserId } as Awaited<ReturnType<typeof auth>>);
}

function mockProfile(profile: { id: string; clerkId: string } | null) {
  vi.mocked(getUserProfile).mockResolvedValue(profile as Awaited<ReturnType<typeof getUserProfile>>);
}

function mockOrganization(role: "ADMIN" | "MANAGER" | "VIEWER" | null, orgId = "org-1", ownerId = "profile-1") {
  vi.mocked(getCurrentOrganization).mockResolvedValue(
    role ? ({ org: { id: orgId, name: "Test Org", plan: "FREE", userId: ownerId }, role } as Awaited<ReturnType<typeof getCurrentOrganization>>) : null
  );
}

function mockRequest(method: "PATCH" | "DELETE", id: string, body?: unknown): Request {
  return new Request(`http://localhost/api/transactions/${id}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

describe("transactions/[id] route", () => {
  const clerkUserId = "clerk-user-1";
  const profileId = "profile-1";
  const otherProfileId = "profile-2";
  const orgId = "org-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth(clerkUserId);
    mockProfile({ id: profileId, clerkId: clerkUserId });
  });

  describe("PATCH", () => {
    it("returns 401 when the user is not authenticated", async () => {
      mockAuth(null);
      mockProfile(null);

      const response = await PATCH(mockRequest("PATCH", "tx-1", { description: "updated" }), {
        params: Promise.resolve({ id: "tx-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("returns 403 for a VIEWER role", async () => {
      mockOrganization("VIEWER");

      const response = await PATCH(mockRequest("PATCH", "tx-1", { description: "updated" }), {
        params: Promise.resolve({ id: "tx-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
    });

    it("returns 400 for invalid input", async () => {
      mockOrganization("ADMIN");

      const response = await PATCH(mockRequest("PATCH", "tx-1", { amount: -10 }), {
        params: Promise.resolve({ id: "tx-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: "Invalid input" });
    });

    it("allows an ADMIN to edit a BUSINESS transaction", async () => {
      mockOrganization("ADMIN");
      const { client, store } = createFakePrisma([
        {
          id: "tx-1",
          organizationId: orgId,
          userId: null,
          scope: "BUSINESS",
          type: "EXPENSE",
          description: "Coffee",
          amount: 5000,
          currency: "COP",
          category: "Food",
        },
      ]);
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

      const response = await PATCH(mockRequest("PATCH", "tx-1", { description: "Updated coffee" }), {
        params: Promise.resolve({ id: "tx-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.transaction.description).toBe("Updated coffee");
      expect(store[0]!.description).toBe("Updated coffee");
      expect(client.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "tx-1", organizationId: orgId, scope: "BUSINESS" },
        })
      );
    });

    it("allows a MANAGER to edit their own PERSONAL transaction", async () => {
      mockOrganization("MANAGER");
      const { client, store } = createFakePrisma([
        {
          id: "tx-1",
          organizationId: orgId,
          userId: profileId,
          scope: "PERSONAL",
          type: "EXPENSE",
          description: "Lunch",
          amount: 12000,
          currency: "COP",
          category: "Food",
        },
      ]);
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

      const response = await PATCH(mockRequest("PATCH", "tx-1", { description: "Updated lunch" }), {
        params: Promise.resolve({ id: "tx-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.transaction.description).toBe("Updated lunch");
      expect(client.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "tx-1", organizationId: orgId, scope: "PERSONAL", userId: profileId },
        })
      );
    });

    it("returns 403 when a MANAGER tries to edit another member's PERSONAL transaction", async () => {
      mockOrganization("MANAGER");
      const { client } = createFakePrisma([
        {
          id: "tx-1",
          organizationId: orgId,
          userId: otherProfileId,
          scope: "PERSONAL",
          type: "EXPENSE",
          description: "Lunch",
          amount: 12000,
          currency: "COP",
          category: "Food",
        },
      ]);
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

      const response = await PATCH(mockRequest("PATCH", "tx-1", { description: "Hacked" }), {
        params: Promise.resolve({ id: "tx-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
      expect(client.transaction.update).not.toHaveBeenCalled();
    });

    it("returns 404 when the transaction does not exist", async () => {
      mockOrganization("ADMIN");
      const { client } = createFakePrisma([]);
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

      const response = await PATCH(mockRequest("PATCH", "tx-missing", { description: "Updated" }), {
        params: Promise.resolve({ id: "tx-missing" }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual({ error: "Transaction not found" });
    });
  });

  describe("DELETE", () => {
    it("returns 401 when the user is not authenticated", async () => {
      mockAuth(null);
      mockProfile(null);

      const response = await DELETE(mockRequest("DELETE", "tx-1"), {
        params: Promise.resolve({ id: "tx-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("returns 403 for a VIEWER role", async () => {
      mockOrganization("VIEWER");

      const response = await DELETE(mockRequest("DELETE", "tx-1"), {
        params: Promise.resolve({ id: "tx-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
    });

    it("allows an ADMIN to delete a BUSINESS transaction", async () => {
      mockOrganization("ADMIN");
      const { client, store } = createFakePrisma([
        {
          id: "tx-1",
          organizationId: orgId,
          userId: null,
          scope: "BUSINESS",
          type: "EXPENSE",
          description: "Coffee",
          amount: 5000,
          currency: "COP",
          category: "Food",
        },
      ]);
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

      const response = await DELETE(mockRequest("DELETE", "tx-1"), {
        params: Promise.resolve({ id: "tx-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true });
      expect(store).toHaveLength(0);
      expect(client.transaction.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "tx-1", organizationId: orgId, scope: "BUSINESS" },
        })
      );
    });

    it("allows a MANAGER to delete their own PERSONAL transaction", async () => {
      mockOrganization("MANAGER");
      const { client, store } = createFakePrisma([
        {
          id: "tx-1",
          organizationId: orgId,
          userId: profileId,
          scope: "PERSONAL",
          type: "EXPENSE",
          description: "Lunch",
          amount: 12000,
          currency: "COP",
          category: "Food",
        },
      ]);
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

      const response = await DELETE(mockRequest("DELETE", "tx-1"), {
        params: Promise.resolve({ id: "tx-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true });
      expect(store).toHaveLength(0);
    });

    it("returns 403 when a MANAGER tries to delete another member's PERSONAL transaction", async () => {
      mockOrganization("MANAGER");
      const { client } = createFakePrisma([
        {
          id: "tx-1",
          organizationId: orgId,
          userId: otherProfileId,
          scope: "PERSONAL",
          type: "EXPENSE",
          description: "Lunch",
          amount: 12000,
          currency: "COP",
          category: "Food",
        },
      ]);
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

      const response = await DELETE(mockRequest("DELETE", "tx-1"), {
        params: Promise.resolve({ id: "tx-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
      expect(client.transaction.delete).not.toHaveBeenCalled();
    });

    it("returns 404 when the transaction does not exist", async () => {
      mockOrganization("ADMIN");
      const { client } = createFakePrisma([]);
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

      const response = await DELETE(mockRequest("DELETE", "tx-missing"), {
        params: Promise.resolve({ id: "tx-missing" }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual({ error: "Transaction not found" });
    });
  });
});
