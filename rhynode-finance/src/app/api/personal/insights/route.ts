import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { generatePersonalInsights, type Nudge } from "@/lib/ai-insights";
import { withRateLimit } from "@/lib/with-rate-limit";
import { getLocale } from "@/lib/locale-server";

export const GET = withRateLimit(
  async () => {
    const profile = await getUserProfile();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const prisma = getPrisma();
      const org = await prisma.organization.findUnique({
        where: { userId: profile.id },
        select: { currency: true },
      });
      const currency = org?.currency ?? "COP";
      const locale = await getLocale();
      const insights = await generatePersonalInsights(profile.id, currency, locale);
      return new Response(JSON.stringify({ insights: insights as Nudge[] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate insights";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  { key: "personal-insights", maxRequests: 30, windowMs: 60000 }
);
