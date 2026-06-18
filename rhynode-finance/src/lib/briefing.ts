export interface BriefingData {
  balance: number;
  monthIncome: number;
  monthExpense: number;
  budgetsExceeded: Array<{ name: string; spent: number; amount: number }>;
  upcomingDebts: Array<{ name: string; remainingAmount: number; dueDate: string | null }>;
  goalsProgress: Array<{ name: string; currentAmount: number; targetAmount: number }>;
}

function formatCop(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-CO")} COP`;
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
export function generateBriefing(data: BriefingData, now = new Date()): string {
  const { balance, monthIncome, monthExpense, budgetsExceeded, upcomingDebts, goalsProgress } = data;

  const net = monthIncome - monthExpense;
  const expenseRatio = monthIncome > 0 ? monthExpense / monthIncome : 0;
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = clamp(dayOfMonth / daysInMonth, 0, 1);

  // Sentence 1 — balance state (positive if > 0, realistic otherwise).
  const balanceSentence =
    balance > 0
      ? `Tu balance total es ${formatCop(balance)}${net >= 0 ? " y vas en positivo" : ", aunque este mes vas al rojo"}.`
      : `Tu balance está en ${formatCop(balance)} — prioridad número uno: estabilizar tu flujo de caja.`;

  // Sentence 2 — cashflow this month vs tempo (did they already spend more than the month has progressed?).
  const burnPace = expenseRatio > monthProgress + 0.1 && monthProgress > 0.15;
  const cashflowSentence = burnPace
    ? `Vas ${formatCop(monthExpense)} gastados de ${formatCop(monthIncome)} ingresados — estás gastando más rápido de lo que avanza el mes, frena un toque.`
    : net >= 0
      ? `Este mes entraron ${formatCop(monthIncome)} y salieron ${formatCop(monthExpense)}, así que vas con un superávit de ${formatCop(net)}.`
      : `Este mes salieron ${formatCop(monthExpense)} contra ${formatCop(monthIncome)} de ingresos — revisa qué gasto puedes recortar.`;

  // Sentence 3 — the most urgent signal: exceeded budget, upcoming debt, or goal progress.
  let urgentSentence: string;
  if (budgetsExceeded.length > 0) {
    const worst = budgetsExceeded[0];
    const over = worst.spent - worst.amount;
    urgentSentence = `Ojo: te pasaste en "${worst.name}" por ${formatCop(over)}${budgetsExceeded.length > 1 ? ` (y en ${budgetsExceeded.length - 1} más)` : ""}.`;
  } else if (upcomingDebts.length > 0) {
    const next = upcomingDebts[0];
    const due = next.dueDate ? ` vence ${new Date(next.dueDate).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}` : "";
    urgentSentence = `Próxima obligación: "${next.name}" por ${formatCop(next.remainingAmount)}${due}.`;
  } else if (goalsProgress.length > 0) {
    const goal = goalsProgress[0];
    const pct = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;
    urgentSentence = `Meta "${goal.name}" al ${pct}% — ${formatCop(goal.currentAmount)} de ${formatCop(goal.targetAmount)}.`;
  } else {
    urgentSentence = `Sin presupuestos excedidos ni deudas próximas — buen momento para definir una meta de ahorro.`;
  }

  // Sentence 4 — closing nudge, scoped to the actual state (no generic fluff).
  const closingSentence = burnPace
    ? "Revisa tus 3 categorías de mayor gasto esta semana y fija un techo diario."
    : net >= 0 && budgetsExceeded.length === 0
      ? "Aprovecha el superávit: transfiere una parte a tu meta de ahorro antes de que se evapore."
      : "Pequeños ajustes esta semana se ven reflejados en el cierre de mes.";

  return [balanceSentence, cashflowSentence, urgentSentence, closingSentence]
    .filter(Boolean)
    .join(" ");
}