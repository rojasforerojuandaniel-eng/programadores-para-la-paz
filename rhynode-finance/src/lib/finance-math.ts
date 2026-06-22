export function daysLeft(deadline: Date | string | null | undefined): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function progressPercentage(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (current / target) * 100));
}

export function monthsBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24 * 30)));
}

interface GoalSuggestionInput {
  targetAmount: number;
  currentAmount: number;
  deadline: Date | null;
}

export function suggestGoalBasedOnAverage(goals: GoalSuggestionInput[]) {
  const activeWithDeadline = goals.filter((g) => g.deadline);
  if (activeWithDeadline.length === 0) return null;

  const monthlyNeeded = activeWithDeadline.map((g) => {
    const months = monthsBetween(new Date(), new Date(g.deadline!));
    return Math.max(0, (g.targetAmount - g.currentAmount) / months);
  });

  const averageMonthly = monthlyNeeded.reduce((a, b) => a + b, 0) / monthlyNeeded.length;
  if (!Number.isFinite(averageMonthly) || averageMonthly <= 0) return null;

  const suggestedMonths = 6;
  const suggestedTarget = averageMonthly * suggestedMonths;
  const suggestedDeadline = new Date(
    Date.now() + suggestedMonths * 30 * 24 * 60 * 60 * 1000
  );

  return {
    monthlyAverage: averageMonthly,
    suggestedTarget,
    suggestedDeadline,
  };
}

export function debtMonthlyPayment(
  remaining: number,
  annualRate: number | null | undefined,
  months: number
): number {
  if (months <= 0 || remaining <= 0) return 0;
  const r = (annualRate ?? 0) / 12 / 100;
  if (r > 0) {
    return (remaining * r) / (1 - Math.pow(1 + r, -months));
  }
  return remaining / months;
}

export function payoffEstimate(remaining: number, monthlyPayment: number) {
  if (monthlyPayment <= 0 || remaining <= 0) return null;
  const months = remaining / monthlyPayment;
  return {
    months,
    days: Math.ceil(months * 30),
  };
}
