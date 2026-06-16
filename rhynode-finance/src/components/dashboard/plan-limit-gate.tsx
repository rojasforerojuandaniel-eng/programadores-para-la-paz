import { checkPlanLimit, getCurrentPlan, PLANS } from "@/lib/subscription";
import { PlanLimitUpgradeCard } from "./plan-limit-upgrade-card";

export interface PlanLimitGateProps {
  orgId: string;
  resource: "invoices" | "users";
  children: React.ReactNode;
}

export async function PlanLimitGate({ orgId, resource, children }: PlanLimitGateProps) {
  const [{ allowed, limit, current }, planKey] = await Promise.all([
    checkPlanLimit(orgId, resource),
    getCurrentPlan(orgId),
  ]);

  if (allowed) {
    return children;
  }

  return (
    <PlanLimitUpgradeCard
      planName={PLANS[planKey].name}
      resource={resource}
      limit={limit}
      current={current}
    />
  );
}
