import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { generatePersonalInsights } from "@/lib/ai-insights";
import { getLocale } from "@/lib/locale-server";
import { AiCopilotClient } from "./ai-copilot-client";

export async function AiCopilot({ currency }: { currency: string }) {
  const profile = await getUserProfile();
  if (!profile) return null;

  const prisma = getPrisma();
  const org = await prisma.organization.findUnique({
    where: { userId: profile.id },
    select: { currency: true },
  });

  const locale = await getLocale();
  const insights = await generatePersonalInsights(profile.id, org?.currency ?? currency, locale);
  return <AiCopilotClient initialInsights={insights} />;
}
