/**
 * Debt payoff strategy planner (avalanche vs snowball). Pure, deterministic —
 * the advisor uses this to answer "¿cómo pago mis deudas?" without an LLM round.
 *
 * - Avalanche: highest interest rate first → minimizes total interest.
 * - Snowball: smallest balance first → maximizes psychological wins.
 */

export type PayoffStrategy = "avalanche" | "snowball";

export interface DebtInput {
  id: string;
  name: string;
  balance: number; // remaining principal
  rate: number; // annual interest rate (e.g. 0.22 = 22%)
  minPayment: number; // minimum monthly payment
}

export interface DebtPlanStep {
  debtId: string;
  name: string;
  monthsToPayoff: number;
  totalInterest: number;
  extraPayment: number;
}

export interface DebtPlanResult {
  strategy: PayoffStrategy;
  totalBalance: number;
  totalInterest: number;
  debtFreeMonths: number;
  steps: DebtPlanStep[];
}

const MONTHLY_INTEREST = 1 / 12;
const MAX_MONTHS = 600; // 50-year safety cap

function sortDebts(debts: DebtInput[], strategy: PayoffStrategy): DebtInput[] {
  if (strategy === "avalanche") {
    return [...debts].sort((a, b) => b.rate - a.rate);
  }
  return [...debts].sort((a, b) => a.balance - b.balance);
}

/**
 * Simulates paying debts in the given order with a fixed total monthly budget.
 * Each month: pay minimums on all, then pour the remainder into the target debt.
 * Returns per-debt payoff month and total interest paid.
 */
export function planDebtPayoff(
  debts: DebtInput[],
  monthlyBudget: number,
  strategy: PayoffStrategy
): DebtPlanResult {
  const ordered = sortDebts(debts, strategy);
  if (ordered.length === 0) {
    return { strategy, totalBalance: 0, totalInterest: 0, debtFreeMonths: 0, steps: [] };
  }

  const balances = ordered.map((d) => d.balance);
  const interestPaid = ordered.map(() => 0);
  const payoffMonth = ordered.map(() => -1);
  const totalMin = ordered.reduce((sum, d) => sum + d.minPayment, 0);
  let month = 0;
  let active = ordered.length;

  while (active > 0 && month < MAX_MONTHS) {
    month++;
    // Accrue monthly interest.
    for (let i = 0; i < ordered.length; i++) {
      if (balances[i] <= 0) continue;
      const interest = balances[i] * ordered[i].rate * MONTHLY_INTEREST;
      interestPaid[i] += interest;
      balances[i] += interest;
    }
    // Pay minimums.
    const extra = Math.max(0, monthlyBudget - totalMin);
    for (let i = 0; i < ordered.length; i++) {
      if (balances[i] <= 0) continue;
      let payment = ordered[i].minPayment;
      if (i === firstActiveIndex(ordered, balances)) {
        payment += extra;
      }
      const applied = Math.min(balances[i], payment);
      balances[i] -= applied;
      if (balances[i] <= 0.005 && payoffMonth[i] === -1) {
        payoffMonth[i] = month;
        active--;
      }
    }
  }

  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const totalInterest = interestPaid.reduce((s, x) => s + x, 0);

  return {
    strategy,
    totalBalance,
    totalInterest,
    debtFreeMonths: month,
    steps: ordered.map((d, i) => ({
      debtId: d.id,
      name: d.name,
      monthsToPayoff: payoffMonth[i] === -1 ? MAX_MONTHS : payoffMonth[i],
      totalInterest: Math.round(interestPaid[i]),
      extraPayment: 0,
    })),
  };
}

function firstActiveIndex(ordered: DebtInput[], balances: number[]): number {
  for (let i = 0; i < ordered.length; i++) {
    if (balances[i] > 0) return i;
  }
  return -1;
}

export function formatDebtPlan(result: DebtPlanResult): string {
  if (result.steps.length === 0) return "No tienes deudas registradas. 🎉";
  const label = result.strategy === "avalanche" ? "avalancha (mayor interés primero)" : "bola de nieve (menor saldo primero)";
  const lines = result.steps
    .map((s) => `• ${s.name}: ~${s.monthsToPayoff} meses, intereses ≈ $${Math.round(s.totalInterest).toLocaleString("es-CO")} COP`)
    .join("\n");
  return `Estrategia ${label}. Con tu presupuesto, quedas libre de deudas en ~${result.debtFreeMonths} meses pagando ~$${Math.round(result.totalInterest).toLocaleString("es-CO")} COP en intereses totales.\n\nOrden sugerido:\n${lines}`;
}