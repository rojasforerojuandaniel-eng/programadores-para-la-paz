import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as subscribe } from "./route";
import { POST as cancel } from "./cancel/route";
import { POST as portal } from "./portal/route";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrganization } from "@/lib/organization.server";
import { canAdmin } from "@/lib/organization";
import { getPrisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

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

vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: {
      create: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    subscriptions: {
      cancel: vi.fn(),
    },
  },
  PLANS: {
    STARTER: { priceId: null },
    PRO: { priceId: "price_pro" },
  },
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
  const sub = {
    id: "sub-1",
    organizationId: fakeOrg.id,
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: "sub_stripe_1",
    status: "ACTIVE",
    plan: "PRO",
  };
  const client = {
    subscription: {
      findUnique: vi.fn(({ where }: { where: { organizationId: string } }) => {
        return Promise.resolve(where.organizationId === fakeOrg.id ? sub : null);
      }),
      update: vi.fn(({ where, data }: { where: { organizationId: string }; data: Record<string, unknown> }) => {
        return Promise.resolve({ ...sub, ...data, organizationId: where.organizationId });
      }),
    },
  };
  return { client, sub };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
});

describe("subscribe routes", () => {
  describe("POST /api/subscribe", () => {
    it("returns 401 when unauthenticated", async () => {
      mockAuth(null);
      const response = await subscribe(new Request("http://localhost/api/subscribe", {
        method: "POST",
        body: JSON.stringify({ plan: "PRO" }),
        headers: { "Content-Type": "application/json" },
      }));
      const body = await response.json();
      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("returns 403 for VIEWER", async () => {
      mockAuth("user-1");
      mockOrg("VIEWER");
      mockAdmin(false);
      const response = await subscribe(new Request("http://localhost/api/subscribe", {
        method: "POST",
        body: JSON.stringify({ plan: "PRO" }),
        headers: { "Content-Type": "application/json" },
      }));
      const body = await response.json();
      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
      expect(canAdmin).toHaveBeenCalledWith("VIEWER");
    });

    it("returns 403 for MANAGER", async () => {
      mockAuth("user-1");
      mockOrg("MANAGER");
      mockAdmin(false);
      const response = await subscribe(new Request("http://localhost/api/subscribe", {
        method: "POST",
        body: JSON.stringify({ plan: "PRO" }),
        headers: { "Content-Type": "application/json" },
      }));
      const body = await response.json();
      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
    });

    it("creates checkout session for ADMIN", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      mockAdmin(true);
      const { client } = createFakePrisma();
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({ url: "https://checkout.stripe.com" } as never);

      const response = await subscribe(new Request("http://localhost/api/subscribe", {
        method: "POST",
        body: JSON.stringify({ plan: "PRO" }),
        headers: { "Content-Type": "application/json" },
      }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ url: "https://checkout.stripe.com" });
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_1",
          line_items: [{ price: "price_pro", quantity: 1 }],
          metadata: { organizationId: fakeOrg.id, plan: "PRO" },
        })
      );
    });
  });

  describe("POST /api/subscribe/cancel", () => {
    it("returns 401 when unauthenticated", async () => {
      mockAuth(null);
      const response = await cancel(new Request("http://localhost/api/subscribe/cancel", { method: "POST" }));
      const body = await response.json();
      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("returns 403 for VIEWER", async () => {
      mockAuth("user-1");
      mockOrg("VIEWER");
      mockAdmin(false);
      const response = await cancel(new Request("http://localhost/api/subscribe/cancel", { method: "POST" }));
      const body = await response.json();
      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
    });

    it("returns 403 for MANAGER", async () => {
      mockAuth("user-1");
      mockOrg("MANAGER");
      mockAdmin(false);
      const response = await cancel(new Request("http://localhost/api/subscribe/cancel", { method: "POST" }));
      const body = await response.json();
      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
    });

    it("cancels subscription for ADMIN", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      mockAdmin(true);
      const { client } = createFakePrisma();
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);
      vi.mocked(stripe.subscriptions.cancel).mockResolvedValue({} as never);

      const response = await cancel(new Request("http://localhost/api/subscribe/cancel", { method: "POST" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true });
      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_stripe_1");
      expect(client.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: fakeOrg.id },
          data: { cancelAtPeriodEnd: true, status: "CANCELED" },
        })
      );
    });
  });

  describe("POST /api/subscribe/portal", () => {
    it("returns 401 when unauthenticated", async () => {
      mockAuth(null);
      const response = await portal(new Request("http://localhost/api/subscribe/portal", { method: "POST" }));
      const body = await response.json();
      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("returns 403 for VIEWER", async () => {
      mockAuth("user-1");
      mockOrg("VIEWER");
      mockAdmin(false);
      const response = await portal(new Request("http://localhost/api/subscribe/portal", { method: "POST" }));
      const body = await response.json();
      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
    });

    it("returns 403 for MANAGER", async () => {
      mockAuth("user-1");
      mockOrg("MANAGER");
      mockAdmin(false);
      const response = await portal(new Request("http://localhost/api/subscribe/portal", { method: "POST" }));
      const body = await response.json();
      expect(response.status).toBe(403);
      expect(body).toEqual({ error: "Forbidden" });
    });

    it("creates portal session for ADMIN", async () => {
      mockAuth("user-1");
      mockOrg("ADMIN");
      mockAdmin(true);
      const { client } = createFakePrisma();
      vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);
      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({ url: "https://portal.stripe.com" } as never);

      const response = await portal(new Request("http://localhost/api/subscribe/portal", { method: "POST" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ url: "https://portal.stripe.com" });
      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_1",
          return_url: expect.stringContaining("/dashboard/settings"),
        })
      );
    });
  });
});
