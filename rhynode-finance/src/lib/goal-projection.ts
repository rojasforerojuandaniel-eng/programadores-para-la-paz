/**
 * Savings goal projection. Pure, deterministic. Given a target, current
 * amount, optional deadline or monthly contribution, computes the required
 * monthly contribution or the projected completion date.
 */

export interface GoalProjectionInput {
  name: string;
  target: number;
  current: number;
  /** Optional monthly contribution to project a completion date. */
  monthlyContribution?: number;
  /** Optional deadline (ISO date) to compute required monthly contribution. */
  deadline?: string;
  /** Optional annual return on savings (e.g. 0.05). */
  annualReturn?: number;
}

export interface GoalProjectionResult {
  name: string;
  target: number;
  current: number;
  remaining: number;
  progressPct: number;
  requiredMonthly?: number; // if deadline given
  projectedMonths?: number; // if monthlyContribution given
  projectedCompletionDate?: string;
  onTrack: boolean;
  alreadyDone: boolean;
}

const MONTHLY_RETURN_FACTOR = (annualReturn: number) => 1 + annualReturn / 12;

export function projectGoal(input: GoalProjectionInput): GoalProjectionResult {
  const { name, target, current, deadline, annualReturn = 0 } = input;
  const remaining = Math.max(0, target - current);
  const progressPct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const alreadyDone = remaining <= 0;

  const result: GoalProjectionResult = {
    name,
    target,
    current,
    remaining,
    progressPct,
    onTrack: alreadyDone,
    alreadyDone,
  };

  if (alreadyDone) return result;

  const r = MONTHLY_RETURN_FACTOR(annualReturn);

  if (deadline) {
    const targetDate = new Date(deadline);
    const now = new Date();
    const months = Math.max(
      1,
      Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
    );
    // Solve for contribution C: future value of current + annuity of C over n months.
    // Approx (no return on contribution simplicity): C = remaining / months when r≈1.
    // With return: use annuity future value formula solved for C.
    let requiredMonthly: number;
    if (annualReturn > 0) {
      const annuityFactor = (Math.pow(r, months) - 1) / (r - 1);
      requiredMonthly = (remaining * Math.pow(r, 0) - 0) / annuityFactor;
      // Simplify: treat current as not growing to keep it conservative.
      requiredMonthly = remaining / annuityFactor;
    } else {
      requiredMonthly = remaining / months;
    }
    result.requiredMonthly = Math.round(requiredMonthly);
    result.onTrack = false;
  }

  if (input.monthlyContribution !== undefined && input.monthlyContribution > 0) {
    let balance = current;
    let months = 0;
    const cap = 1200; // 100-year safety
    while (balance < target && months < cap) {
      balance = balance * r + input.monthlyContribution;
      months++;
    }
    result.projectedMonths = months;
    const completion = new Date();
    completion.setMonth(completion.getMonth() + months);
    result.projectedCompletionDate = completion.toISOString().split("T")[0];
    result.onTrack = input.deadline
      ? result.projectedCompletionDate! <= input.deadline
      : true;
  }

  return result;
}

export function formatGoalProjection(r: GoalProjectionResult): string {
  if (r.alreadyDone) return `🎉 Meta "${r.name}" completada (${r.progressPct}%).`;
  const parts = [`Meta "${r.name}": ${r.progressPct}% ($${Math.round(r.current).toLocaleString("es-CO")} / $${Math.round(r.target).toLocaleString("es-CO")} COP).`];
  if (r.requiredMonthly !== undefined) {
    parts.push(`Para llegar a tiempo necesitas ahorrar ~$${r.requiredMonthly.toLocaleString("es-CO")} COP/mes.`);
  }
  if (r.projectedMonths !== undefined) {
    parts.push(`Con tu aporte actual, la alcanzas en ~${r.projectedMonths} meses (${r.projectedCompletionDate}).`);
  }
  return parts.join(" ");
}