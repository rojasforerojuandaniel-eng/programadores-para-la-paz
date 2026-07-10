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

vi.mock("@/lib/audit-log", () => ({
  auditLog: vi.fn(),
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
    client: {
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
  return new Request("http://localhost/api/clients", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("clients route", () => {
  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      mockAuth(null);
      const response = await GET(new Request("http://localhost/api/clients"));
      const body = await response.json();
      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("returns clients for VIEWER", async () => {
      mockAuth("user-1");
      mockOrg("VIEWER");
      const clients = [{ id: "client-1", organizationId: fakeOrg.id, name: "Acme" }];
      vi.mocked(prisma.client.findMany).mockResolvedValue(clients as never);

      const response = await GET(new Request("http://localhost/api/clients"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.clients).toEqual(clients);
      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: fakeOrg.id } })
      );
    });

    it("returns clients for ADMIN", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      const clients = [{ id: "client-1", organizationId: fakeOrg.id, name: "Acme" }];
      vi.mocked(prisma.client.findMany).mockResolvedValue(clients as never);

      const response = await GET(new Request("http://localhost/api/clients"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.clients).toEqual(clients);
    });
  });

  describe("POST", () => {
    const validBody = {
      name: "Acme Inc",
      email: "acme@example.com",
      country: "CO",
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
      expect(prisma.client.create).not.toHaveBeenCalled();
    });

    it("creates client for MANAGER", async () => {
      mockAuth("user-1");
      mockOrg("MANAGER");
      const created = {
        id: "client-1",
        organizationId: fakeOrg.id,
        ...validBody,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.client.create).mockResolvedValue(created as never);

      const response = await POST(mockPostRequest(validBody));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.client).toEqual({
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: fakeOrg.id,
            name: validBody.name,
            email: validBody.email,
            country: validBody.country,
          }),
        })
      );
    });

    it("creates client for ADMIN", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      const created = {
        id: "client-1",
        organizationId: fakeOrg.id,
        ...validBody,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.client.create).mockResolvedValue(created as never);

      const response = await POST(mockPostRequest(validBody));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.client).toEqual(
        expect.objectContaining({
          organizationId: fakeOrg.id,
          name: validBody.name,
          email: validBody.email,
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
      expect(prisma.client.create).not.toHaveBeenCalled();
    });
  });
});
