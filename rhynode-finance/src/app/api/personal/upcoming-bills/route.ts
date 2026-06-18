import { getUserProfile, getOrCreateAuthOrg } from "@/lib/auth";
import { withRateLimit } from "@/lib/with-rate-limit";
import { getUpcomingBills, type UpcomingBill } from "@/lib/upcoming-bills";
import { z } from "zod";

const querySchema = z.object({
  horizon: z.coerce.number().int().min(7).max(180).optional(),
});

export const GET = withRateLimit(
  async (request: Request) => {
    const profile = await getUserProfile();
    if (!profile) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) {
      return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const org = await getOrCreateAuthOrg().catch(() => null);
    const horizon = parsed.data.horizon ?? 60;
    const bills = await getUpcomingBills(profile.id, org?.id ?? null, horizon);

    const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
    const overdue = bills.filter((bill) => bill.overdue);
    const overdueTotal = overdue.reduce((sum, bill) => sum + bill.amount, 0);

    return Response.json({
      bills: bills as UpcomingBill[],
      count: bills.length,
      total,
      overdueCount: overdue.length,
      overdueTotal,
    });
  },
  { key: "upcoming-bills", maxRequests: 30, windowMs: 60000 }
);