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
    paymentLink: {
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
  return new Request("http://localhost/api/payment-links", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("payment-links route", () => {
  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      mockAuth(null);
      const response = await GET(new Request("http://localhost/api/payment-links"));
      const body = await response.json();
      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("returns links for VIEWER", async () => {
      mockAuth("user-1");
      mockOrg("VIEWER");
      const links = [{ id: "link-1", organizationId: fakeOrg.id, name: "Pago 1" }];
      vi.mocked(prisma.paymentLink.findMany).mockResolvedValue(links as never);

      const response = await GET(new Request("http://localhost/api/payment-links"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.links).toEqual(links);
      expect(prisma.paymentLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: fakeOrg.id } })
      );
    });

    it("returns links for ADMIN", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      const links = [{ id: "link-1", organizationId: fakeOrg.id, name: "Pago 1" }];
      vi.mocked(prisma.paymentLink.findMany).mockResolvedValue(links as never);

      const response = await GET(new Request("http://localhost/api/payment-links"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.links).toEqual(links);
    });
  });

  describe("POST", () => {
    const validBody = {
      name: "Pago servicio",
      amount: 50000,
      urlSlug: "pago-servicio-1",
      currency: "COP",
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
      expect(prisma.paymentLink.create).not.toHaveBeenCalled();
    });

    it("creates link for MANAGER", async () => {
      mockAuth("user-1");
      mockOrg("MANAGER");
      const created = {
        id: "link-1",
        organizationId: fakeOrg.id,
        ...validBody,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.paymentLink.create).mockResolvedValue(created as never);

      const response = await POST(mockPostRequest(validBody));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.link).toEqual({
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
      expect(prisma.paymentLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: fakeOrg.id,
            name: validBody.name,
            amount: validBody.amount,
            urlSlug: validBody.urlSlug,
            currency: validBody.currency,
          }),
        })
      );
    });

    it("creates link for ADMIN", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      const created = {
        id: "link-1",
        organizationId: fakeOrg.id,
        ...validBody,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.paymentLink.create).mockResolvedValue(created as never);

      const response = await POST(mockPostRequest(validBody));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.link).toEqual(
        expect.objectContaining({
          organizationId: fakeOrg.id,
          name: validBody.name,
          amount: validBody.amount,
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
      expect(prisma.paymentLink.create).not.toHaveBeenCalled();
    });
  });
});
