import { Suspense } from "react";
import { computeFinancialInsights } from "@/lib/ai-financial-insights";
import { AiInsightsCardClient } from "@/components/dashboard/ai-insights-card-client";
import { AiInsightsCardSkeleton } from "@/components/dashboard/ai-insights-card-skeleton";
import type { UserScope } from "@/lib/scope";

interface AiInsightsCardProps {
  userId: string | undefined;
  orgId: string | undefined;
  currency: string;
  scope: UserScope;
}

async function AiInsightsCardInner({
  userId,
  orgId,
  currency,
  scope,
}: {
  userId: string;
  orgId: string;
  currency: string;
  scope: UserScope;
}) {
  let insights: Awaited<ReturnType<typeof computeFinancialInsights>> | null = null;
  try {
    insights = await computeFinancialInsights({
      userId,
      orgId,
      currency,
      scope: scope === "PERSONAL" || scope === "BOTH" ? "PERSONAL" : scope,
    });
  } catch {
    insights = null;
  }

  return <AiInsightsCardClient initialInsights={insights} currency={currency} />;
}

export function AiInsightsCard({ userId, orgId, currency, scope }: AiInsightsCardProps) {
  if (!userId || !orgId) {
    return null;
  }

  const isPersonalScope = scope === "PERSONAL" || scope === "BOTH";
  if (!isPersonalScope) {
    return null;
  }

  return (
    <Suspense fallback={<AiInsightsCardSkeleton />}>
      <AiInsightsCardInner userId={userId} orgId={orgId} currency={currency} scope={scope} />
    </Suspense>
  );
}
