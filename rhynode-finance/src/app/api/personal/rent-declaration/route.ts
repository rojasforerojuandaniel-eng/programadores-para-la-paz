import { getUserProfile, getOrCreateAuthOrg } from "@/lib/auth";
import { withRateLimit } from "@/lib/with-rate-limit";
import { computeRentDeclaration } from "@/lib/rent-declaration";
import { z } from "zod";

const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(new Date().getFullYear() + 1),
  dependents: z.coerce.number().int().min(0).max(20).optional(),
});

export const GET = withRateLimit(
  async (request: Request) => {
    const profile = await getUserProfile();
    if (!profile) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams)
    );
    if (!parsed.success) {
      return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const org = await getOrCreateAuthOrg().catch(() => null);
    const result = await computeRentDeclaration({
      userId: profile.id,
      orgId: org?.id ?? null,
      year: parsed.data.year,
      dependents: parsed.data.dependents,
    });

    return Response.json(result);
  },
  { key: "rent-declaration", maxRequests: 20, windowMs: 60000 }
);