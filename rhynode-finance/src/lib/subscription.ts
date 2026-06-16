import { prisma } from "./prisma";

export const PLANS = {
  STARTER: {
    name: "Starter",
    limits: { invoices: 10, users: 1 },
  },
  GROWTH: {
    name: "Growth",
    limits: { invoices: 100, users: 3 },
  },
  SCALE: {
    name: "Scale",
    limits: { invoices: Infinity, users: Infinity },
  },
};

export async function getCurrentPlan(orgId: string): Promise<keyof typeof PLANS> {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
  });
  return (sub?.plan as keyof typeof PLANS) || "STARTER";
}

export async function checkPlanLimit(
  orgId: string,
  resource: "invoices" | "users"
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const planName = await getCurrentPlan(orgId);
  const plan = PLANS[planName];
  const limit = plan.limits[resource];

  if (limit === Infinity) {
    return { allowed: true, limit: Infinity, current: 0 };
  }

  let current = 0;
  if (resource === "invoices") {
    current = await prisma.invoice.count({
      where: { organizationId: orgId },
    });
  }

  return { allowed: current < limit, limit, current };
}
