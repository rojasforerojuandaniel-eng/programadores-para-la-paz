import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE, POST } from "./route";
import { getUserProfileFromRequest } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

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
    getUserProfileFromRequest: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
}));

type TokenRecord = { id: string; userId: string; token: string; createdAt: Date; updatedAt?: Date };

function createFakePrisma(initialTokens: TokenRecord[] = []) {
  const store: TokenRecord[] = [...initialTokens];

  function findMany(args: {
    where?: { userId?: string; id?: { in?: string[] } };
    orderBy?: { createdAt?: "asc" | "desc" };
    take?: number;
    select?: { id?: boolean };
  }) {
    let results = [...store];
    if (args.where?.userId) {
      results = results.filter((t) => t.userId === args.where!.userId);
    }
    if (args.where?.id?.in) {
      results = results.filter((t) => args.where!.id!.in!.includes(t.id));
    }
    if (args.orderBy?.createdAt === "asc") {
      results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    if (args.orderBy?.createdAt === "desc") {
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    if (args.take) {
      results = results.slice(0, args.take);
    }
    if (args.select?.id) {
      return results.map((t) => ({ id: t.id }));
    }
    return results;
  }

  const client = {
    expoPushToken: {
      count: vi.fn(({ where }: { where?: { userId?: string } }) => {
        return Promise.resolve(store.filter((t) => !where || t.userId === where.userId).length);
      }),
      findUnique: vi.fn(({ where }: { where: { token: string } }) => {
        return Promise.resolve(store.find((t) => t.token === where.token) ?? null);
      }),
      findMany: vi.fn(findMany),
      deleteMany: vi.fn(({ where }: { where: { id?: { in: string[] } } }) => {
        const ids = where.id?.in ?? [];
        const before = store.length;
        for (let i = store.length - 1; i >= 0; i--) {
          if (ids.includes(store[i]!.id)) {
            store.splice(i, 1);
          }
        }
        return Promise.resolve({ count: before - store.length });
      }),
      upsert: vi.fn(
        ({
          where,
          update,
          create,
        }: {
          where: { token: string };
          update: { userId: string };
          create: { userId: string; token: string };
        }) => {
          const index = store.findIndex((t) => t.token === where.token);
          const now = new Date();
          if (index >= 0) {
            store[index] = { ...store[index]!, userId: update.userId, updatedAt: now };
            return Promise.resolve(store[index]);
          }
          const created = {
            id: `token-${store.length + 1}`,
            userId: create.userId,
            token: create.token,
            createdAt: now,
            updatedAt: now,
          };
          store.push(created);
          return Promise.resolve(created);
        }
      ),
    },
    $transaction: vi.fn(async (fn: (tx: typeof client) => Promise<unknown>) => {
      return fn(client);
    }),
  };

  return { client, store };
}

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/mobile/push-token", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("push-token route", () => {
  const fakeProfile = {
    id: "user-123",
    clerkId: "clerk-123",
    email: "test@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserProfileFromRequest).mockResolvedValue(fakeProfile as Awaited<ReturnType<typeof getUserProfileFromRequest>>);
  });

  describe("POST", () => {
    it("saves a new push token when under the limit", async () => {
      const { client } = createFakePrisma();
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

      const response = await POST(mockRequest({ token: "expo-token-new" }));
      const body = await response.json();

      expect(body).toEqual({ ok: true });
      expect(response.status).toBe(200);
      expect(client.expoPushToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: "expo-token-new" },
          create: { userId: fakeProfile.id, token: "expo-token-new" },
        })
      );
    });

    it("removes the oldest token when the user already has 5 tokens", async () => {
      const base = new Date("2026-01-01T00:00:00.000Z");
      const { client, store } = createFakePrisma(
        Array.from({ length: 5 }, (_, i) => ({
          id: `existing-${i}`,
          userId: fakeProfile.id,
          token: `old-token-${i}`,
          createdAt: new Date(base.getTime() + i * 1000),
        }))
      );
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

      const response = await POST(mockRequest({ token: "expo-token-latest" }));
      const body = await response.json();

      expect(body).toEqual({ ok: true });
      expect(response.status).toBe(200);
      expect(store).toHaveLength(5);
      expect(store.find((t) => t.token === "old-token-0")).toBeUndefined();
      expect(store.find((t) => t.token === "expo-token-latest")).toBeDefined();
    });

    it("does not delete other tokens when the same token is re-registered", async () => {
      const { client, store } = createFakePrisma([
        {
          id: "existing-1",
          userId: fakeProfile.id,
          token: "expo-token-same",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]);
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

      const response = await POST(mockRequest({ token: "expo-token-same" }));
      const body = await response.json();

      expect(body).toEqual({ ok: true });
      expect(store).toHaveLength(1);
      expect(client.expoPushToken.findUnique).toHaveBeenCalledWith({ where: { token: "expo-token-same" } });
      expect(client.expoPushToken.count).not.toHaveBeenCalled();
    });

    it("returns 401 when the user is not authenticated", async () => {
      vi.mocked(getUserProfileFromRequest).mockResolvedValue(null);

      const response = await POST(mockRequest({ token: "expo-token" }));
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("returns 400 when the payload is invalid", async () => {
      const response = await POST(mockRequest({ token: "" }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid input");
    });

    it("returns 500 when Prisma throws", async () => {
      const { client } = createFakePrisma();
      client.$transaction.mockRejectedValue(new Error("DB down"));
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

      const response = await POST(mockRequest({ token: "expo-token" }));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({ error: "Failed to save token" });
    });
  });

  describe("DELETE", () => {
    it("revokes all tokens for the authenticated user", async () => {
      const { client } = createFakePrisma([
        { id: "t1", userId: fakeProfile.id, token: "a", createdAt: new Date() },
        { id: "t2", userId: fakeProfile.id, token: "b", createdAt: new Date() },
      ]);
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

      const request = new Request("http://localhost/api/mobile/push-token", { method: "DELETE" });
      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ ok: true });
      expect(client.expoPushToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: fakeProfile.id },
      });
    });

    it("returns 401 when the user is not authenticated", async () => {
      vi.mocked(getUserProfileFromRequest).mockResolvedValue(null);

      const request = new Request("http://localhost/api/mobile/push-token", { method: "DELETE" });
      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    });
  });
});
