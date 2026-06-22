import type { Locale } from "@/lib/locale";
import { formatCurrency, formatDate } from "@/lib/format";

export interface BriefingData {
  balance: number;
  monthIncome: number;
  monthExpense: number;
  budgetsExceeded: Array<{ name: string; spent: number; amount: number }>;
  upcomingDebts: Array<{ name: string; remainingAmount: number; dueDate: string | null }>;
  goalsProgress: Array<{ name: string; currentAmount: number; targetAmount: number }>;
}

function formatCop(amount: number, locale: Locale): string {
  return `${formatCurrency(amount, "COP", locale)} COP`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * Deterministic daily briefing generator. Replaces the LLM-based briefing so
 * the feature costs $0 per request while staying precise (real numbers, not
 * vague prose). Tone is chosen by conditional rules, not a model.
 *
 * Returns 3-4 sentences summarizing the user's financial state with a
 * motivational-but-realistic tone.
 */
export function generateBriefing(data: BriefingData, now = new Date(), locale: Locale = "es"): string {
  const { balance, monthIncome, monthExpense, budgetsExceeded, upcomingDebts, goalsProgress } = data;
  const en = locale === "en";

  const net = monthIncome - monthExpense;
  const expenseRatio = monthIncome > 0 ? monthExpense / monthIncome : 0;
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = clamp(dayOfMonth / daysInMonth, 0, 1);

  // Sentence 1 — balance state (positive if > 0, realistic otherwise).
  const balanceSentence =
    balance > 0
      ? en
        ? `Your total balance is ${formatCop(balance, locale)}${net >= 0 ? " and you're in the black" : ", though this month you're in the red"}.`
        : `Tu balance total es ${formatCop(balance, locale)}${net >= 0 ? " y vas en positivo" : ", aunque este mes vas al rojo"}.`
      : en
        ? `Your balance is at ${formatCop(balance, locale)} — priority number one: stabilize your cash flow.`
        : `Tu balance está en ${formatCop(balance, locale)} — prioridad número uno: estabilizar tu flujo de caja.`;

  // Sentence 2 — cashflow this month vs tempo (did they already spend more than the month has progressed?).
  const burnPace = expenseRatio > monthProgress + 0.1 && monthProgress > 0.15;
  const cashflowSentence = burnPace
    ? en
      ? `You've spent ${formatCop(monthExpense, locale)} of ${formatCop(monthIncome, locale)} earned — you're spending faster than the month is progressing, ease off a bit.`
      : `Vas ${formatCop(monthExpense, locale)} gastados de ${formatCop(monthIncome, locale)} ingresados — estás gastando más rápido de lo que avanza el mes, frena un toque.`
    : net >= 0
      ? en
        ? `This month ${formatCop(monthIncome, locale)} came in and ${formatCop(monthExpense, locale)} went out, so you're running a surplus of ${formatCop(net, locale)}.`
        : `Este mes entraron ${formatCop(monthIncome, locale)} y salieron ${formatCop(monthExpense, locale)}, así que vas con un superávit de ${formatCop(net, locale)}.`
      : en
        ? `This month ${formatCop(monthExpense, locale)} went out against ${formatCop(monthIncome, locale)} of income — review what expense you can cut.`
        : `Este mes salieron ${formatCop(monthExpense, locale)} contra ${formatCop(monthIncome, locale)} de ingresos — revisa qué gasto puedes recortar.`;

  // Sentence 3 — the most urgent signal: exceeded budget, upcoming debt, or goal progress.
  let urgentSentence: string;
  if (budgetsExceeded.length > 0) {
    const worst = budgetsExceeded[0];
    const over = worst.spent - worst.amount;
    const extra = budgetsExceeded.length > 1
      ? en
        ? ` (and ${budgetsExceeded.length - 1} more)`
        : ` (y en ${budgetsExceeded.length - 1} más)`
      : "";
    urgentSentence = en
      ? `Heads up: you overspent on "${worst.name}" by ${formatCop(over, locale)}${extra}.`
      : `Ojo: te pasaste en "${worst.name}" por ${formatCop(over, locale)}${extra}.`;
  } else if (upcomingDebts.length > 0) {
    const next = upcomingDebts[0];
    const due = next.dueDate
      ? en
        ? ` due ${formatDate(next.dueDate, locale, { day: "numeric", month: "short" })}`
        : ` vence ${formatDate(next.dueDate, locale, { day: "numeric", month: "short" })}`
      : "";
    urgentSentence = en
      ? `Next obligation: "${next.name}" for ${formatCop(next.remainingAmount, locale)}${due}.`
      : `Próxima obligación: "${next.name}" por ${formatCop(next.remainingAmount, locale)}${due}.`;
  } else if (goalsProgress.length > 0) {
    const goal = goalsProgress[0];
    const pct = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;
    urgentSentence = en
      ? `Goal "${goal.name}" at ${pct}% — ${formatCop(goal.currentAmount, locale)} of ${formatCop(goal.targetAmount, locale)}.`
      : `Meta "${goal.name}" al ${pct}% — ${formatCop(goal.currentAmount, locale)} de ${formatCop(goal.targetAmount, locale)}.`;
  } else {
    urgentSentence = en
      ? `No budgets exceeded and no upcoming debts — a good moment to set a savings goal.`
      : `Sin presupuestos excedidos ni deudas próximas — buen momento para definir una meta de ahorro.`;
  }

  // Sentence 4 — closing nudge, scoped to the actual state (no generic fluff).
  const closingSentence = burnPace
    ? en
      ? "Review your top 3 spending categories this week and set a daily cap."
      : "Revisa tus 3 categorías de mayor gasto esta semana y fija un techo diario."
    : net >= 0 && budgetsExceeded.length === 0
      ? en
        ? "Take advantage of the surplus: move part of it to your savings goal before it evaporates."
        : "Aprovecha el superávit: transfiere una parte a tu meta de ahorro antes de que se evapore."
      : en
        ? "Small adjustments this week will show up at month-end close."
        : "Pequeños ajustes esta semana se ven reflejados en el cierre de mes.";

  return [balanceSentence, cashflowSentence, urgentSentence, closingSentence]
    .filter(Boolean)
    .join(" ");
}