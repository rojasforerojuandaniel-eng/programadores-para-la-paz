import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "./route";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrganization } from "@/lib/organization.server";
import { canAdmin } from "@/lib/organization";
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

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/organization.server", () => ({
  getCurrentOrganization: vi.fn(),
}));

vi.mock("@/lib/organization", async () => {
  const actual = await vi.importActual<typeof import("@/lib/organization")>("@/lib/organization");
  return {
    ...actual,
    canAdmin: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
}));

const fakeOrg = { id: "org-1", name: "Test Org", plan: "STARTER", userId: "profile-1" };

function mockAuth(userId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
}

function mockOrg(role: "ADMIN" | "MANAGER" | "VIEWER" | null) {
  vi.mocked(getCurrentOrganization).mockResolvedValue(role ? { org: fakeOrg, role } : null);
}

function mockAdmin(allowed: boolean) {
  vi.mocked(canAdmin).mockReturnValue(allowed);
}

function createFakePrisma() {
  const orgs = [{ ...fakeOrg }];
  const profiles = [{ id: "profile-1", scope: "PERSONAL", hasBusiness: false, onboardingCompleted: false }];
  const client = {
    organization: {
      findUnique: vi.fn(({ where }: { where: { id: string } }) => {
        return Promise.resolve(orgs.find((o) => o.id === where.id) ?? null);
      }),
      update: vi.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const index = orgs.findIndex((o) => o.id === where.id);
        if (index >= 0) {
          orgs[index] = { ...orgs[index]!, ...data };
          return Promise.resolve(orgs[index]);
        }
        return Promise.resolve(null);
      }),
    },
    userProfile: {
      findUnique: vi.fn(({ where }: { where: { id: string } }) => {
        return Promise.resolve(profiles.find((p) => p.id === where.id) ?? null);
      }),
      update: vi.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const index = profiles.findIndex((p) => p.id === where.id);
        if (index >= 0) {
          profiles[index] = { ...profiles[index]!, ...data };
          return Promise.resolve(profiles[index]);
        }
        return Promise.resolve(null);
      }),
    },
  };
  return { client, orgs, profiles };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("organization route", () => {
  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      mockAuth(null);
      const response = await GET(new Request("http://localhost/api/organization"));
      const body = await response.json();
      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("returns 403 for VIEWER", async () => {
      mockAuth("user-1");
      mockOrg("VIEWER");
      mockAdmin(false);
      const response = await GET(new Request("http://localhost/api/organization"));
      const body = await response.json();
      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
    });

    it("returns 403 for MANAGER", async () => {
      mockAuth("user-1");
      mockOrg("MANAGER");
      mockAdmin(false);
      const response = await GET(new Request("http://localhost/api/organization"));
      const body = await response.json();
      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
    });

    it("returns organization for ADMIN", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      mockAdmin(true);
      const response = await GET(new Request("http://localhost/api/organization"));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual({ organization: fakeOrg });
    });
  });

  describe("PUT", () => {
    function mockRequest(body: unknown): Request {
      return new Request("http://localhost/api/organization", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });
    }

    it("returns 401 when unauthenticated", async () => {
      mockAuth(null);
      const response = await PUT(mockRequest({ name: "Updated" }));
      const body = await response.json();
      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("returns 403 for VIEWER", async () => {
      mockAuth("user-1");
      mockOrg("VIEWER");
      mockAdmin(false);
      const response = await PUT(mockRequest({ name: "Updated" }));
      const body = await response.json();
      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
    });

    it("returns 403 for MANAGER", async () => {
      mockAuth("user-1");
      mockOrg("MANAGER");
      mockAdmin(false);
      const response = await PUT(mockRequest({ name: "Updated" }));
      const body = await response.json();
      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
    });

    it("updates organization for ADMIN", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      mockAdmin(true);
      const { client } = createFakePrisma();
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

      const response = await PUT(mockRequest({ name: "Updated Org" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.organization).toEqual(expect.objectContaining({ id: fakeOrg.id, name: "Updated Org" }));
      expect(client.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: fakeOrg.id },
          data: { name: "Updated Org" },
        })
      );
    });

    it("returns 400 for invalid input", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      mockAdmin(true);
      const response = await PUT(mockRequest({ country: "INVALID" }));
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid input");
    });
  });
});
