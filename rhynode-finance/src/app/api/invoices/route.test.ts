import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrganization } from "@/lib/organization.server";
import { prisma } from "@/lib/prisma";
import { checkPlanLimit } from "@/lib/subscription";
import { generateInvoiceNumber } from "@/lib/invoices";

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

vi.mock("@/lib/subscription", () => ({
  checkPlanLimit: vi.fn(),
}));

vi.mock("@/lib/invoices", () => ({
  generateInvoiceNumber: vi.fn(),
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
    invoice: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
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
  return new Request("http://localhost/api/invoices", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkPlanLimit).mockResolvedValue({ allowed: true, limit: 100, current: 0 });
  vi.mocked(generateInvoiceNumber).mockResolvedValue("INV-001");
  vi.mocked(prisma.client.findUnique).mockResolvedValue({
    id: "client-1",
    organizationId: fakeOrg.id,
    name: "Acme",
  } as never);
  vi.mocked(prisma.project.findUnique).mockResolvedValue(null as never);
});

describe("invoices route", () => {
  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      mockAuth(null);
      const response = await GET(new Request("http://localhost/api/invoices"));
      const body = await response.json();
      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("returns invoices for VIEWER", async () => {
      mockAuth("user-1");
      mockOrg("VIEWER");
      const invoices = [
        { id: "inv-1", organizationId: fakeOrg.id, number: "INV-001", client: {}, items: [], project: null },
      ];
      vi.mocked(prisma.invoice.findMany).mockResolvedValue(invoices as never);

      const response = await GET(new Request("http://localhost/api/invoices"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.invoices).toEqual(invoices);
      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: fakeOrg.id } })
      );
    });

    it("returns invoices for ADMIN", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      const invoices = [
        { id: "inv-1", organizationId: fakeOrg.id, number: "INV-001", client: {}, items: [], project: null },
      ];
      vi.mocked(prisma.invoice.findMany).mockResolvedValue(invoices as never);

      const response = await GET(new Request("http://localhost/api/invoices"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.invoices).toEqual(invoices);
    });
  });

  describe("POST", () => {
    const validBody = {
      clientId: "client-1",
      currency: "COP",
      subtotal: 100000,
      taxRate: 19,
      taxAmount: 19000,
      total: 119000,
      notes: "Notas",
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
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it("creates invoice for MANAGER", async () => {
      mockAuth("user-1");
      mockOrg("MANAGER");
      const created = {
        id: "inv-1",
        organizationId: fakeOrg.id,
        clientId: validBody.clientId,
        number: "INV-001",
        currency: validBody.currency,
        subtotal: validBody.subtotal,
        taxRate: validBody.taxRate,
        taxAmount: validBody.taxAmount,
        total: validBody.total,
        issueDate: new Date(),
        dueDate: null,
        notes: validBody.notes,
        terms: null,
        client: { id: "client-1" },
        items: [],
        project: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.invoice.create).mockResolvedValue(created as never);

      const response = await POST(mockPostRequest(validBody));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.invoice).toEqual({
        ...created,
        issueDate: created.issueDate.toISOString(),
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
      expect(checkPlanLimit).toHaveBeenCalledWith(fakeOrg.id, "invoices");
      expect(prisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: fakeOrg.id,
            clientId: validBody.clientId,
            number: "INV-001",
          }),
        })
      );
    });

    it("creates invoice for ADMIN", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      const created = {
        id: "inv-1",
        organizationId: fakeOrg.id,
        clientId: validBody.clientId,
        number: "INV-001",
        currency: validBody.currency,
        subtotal: validBody.subtotal,
        taxRate: validBody.taxRate,
        taxAmount: validBody.taxAmount,
        total: validBody.total,
        issueDate: new Date(),
        dueDate: null,
        notes: validBody.notes,
        terms: null,
        client: { id: "client-1" },
        items: [],
        project: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.invoice.create).mockResolvedValue(created as never);

      const response = await POST(mockPostRequest(validBody));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.invoice).toEqual(
        expect.objectContaining({
          organizationId: fakeOrg.id,
          clientId: validBody.clientId,
          number: "INV-001",
        })
      );
    });

    it("returns 400 for invalid input", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      const response = await POST(mockPostRequest({ currency: "COP" }));
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid input");
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });
  });
});
