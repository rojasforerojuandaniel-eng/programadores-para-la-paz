import {
  addMonths,
  differenceInMonths,
  format,
  getDaysInMonth,
  getMonth,
  parseISO,
  startOfMonth,
} from "date-fns";

export interface HistoricalMonth {
  month: string; // yyyy-MM
  income: number;
  expenses: number;
}

export interface RecurringTransactionInput {
  id?: string;
  name: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  frequency: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  status?: string;
}

export interface ColombianEventsConfig {
  includeAguinaldo?: boolean;
  includePrima?: boolean;
  includeIvaBimestral?: boolean;
  averageMonthlyIva?: number;
}

export interface ScenarioConfig {
  optimistic: { incomeMultiplier: number; expenseMultiplier: number };
  pessimistic: { incomeMultiplier: number; expenseMultiplier: number };
}

export interface ProjectionMonth {
  month: string;
  monthIndex: number;
  baseIncome: number;
  baseExpenses: number;
  recurringIncome: number;
  recurringExpenses: number;
  variableIncome: number;
  variableExpenses: number;
  eventIncome: number;
  eventExpenses: number;
  net: number;
  baseBalance: number;
  optimisticBalance: number;
  pessimisticBalance: number;
  events: string[];
}

export interface CashflowProjection {
  projection: ProjectionMonth[];
  summary: {
    currentBalance: number;
    monthsToProject: number;
    finalBaseBalance: number;
    finalOptimisticBalance: number;
    finalPessimisticBalance: number;
    riskMonth: string | null;
    lowestBalance: number;
    averageMonthlyNet: number;
    recommendation: string;
  };
}

const DEFAULT_SCENARIO_CONFIG: ScenarioConfig = {
  optimistic: { incomeMultiplier: 1.1, expenseMultiplier: 0.95 },
  pessimistic: { incomeMultiplier: 0.9, expenseMultiplier: 1.1 },
};

const MAX_MONTHS = 60;

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) {
    return { slope: 0, intercept: values[0] ?? 0 };
  }

  const sumX = values.reduce((sum, _, i) => sum + i, 0);
  const sumY = values.reduce((sum, v) => sum + v, 0);
  const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
  const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function countRecurringOccurrencesInMonth(
  recurring: RecurringTransactionInput,
  monthStart: Date
): number {
  if (recurring.status && recurring.status !== "ACTIVE") return 0;

  const start = startOfMonth(toDate(recurring.startDate));
  const end = recurring.endDate ? startOfMonth(toDate(recurring.endDate)) : null;

  if (monthStart < start) return 0;
  if (end && monthStart > end) return 0;

  const freq = recurring.frequency.toUpperCase();
  const days = getDaysInMonth(monthStart);

  switch (freq) {
    case "DAILY":
      return days;
    case "WEEKLY":
      return Math.max(1, Math.floor(days / 7));
    case "BIWEEKLY":
      return Math.max(1, Math.floor(days / 14));
    case "MONTHLY":
      return 1;
    case "QUARTERLY": {
      const diff = differenceInMonths(monthStart, start);
      return diff >= 0 && diff % 3 === 0 ? 1 : 0;
    }
    case "YEARLY":
      return getMonth(monthStart) === getMonth(start) ? 1 : 0;
    default:
      return 1;
  }
}

function projectRecurringForMonth(
  recurring: RecurringTransactionInput[],
  monthStart: Date
): { income: number; expenses: number } {
  let income = 0;
  let expenses = 0;

  for (const r of recurring) {
    const occurrences = countRecurringOccurrencesInMonth(r, monthStart);
    if (occurrences <= 0) continue;

    const amount = r.amount * occurrences;
    if (r.type === "INCOME") {
      income += amount;
    } else {
      expenses += amount;
    }
  }

  return { income, expenses };
}

function buildSeasonalIndices(
  historicalVariable: Array<{ month: string; income: number; expenses: number }>
): { income: number[]; expenses: number[] } {
  const incomeByMonth: number[][] = Array.from({ length: 12 }, () => []);
  const expensesByMonth: number[][] = Array.from({ length: 12 }, () => []);

  for (const h of historicalVariable) {
    const monthIndex = getMonth(parseISO(`${h.month}-01`));
    incomeByMonth[monthIndex].push(h.income);
    expensesByMonth[monthIndex].push(h.expenses);
  }

  const overallIncomeMedian = median(historicalVariable.map((h) => h.income));
  const overallExpensesMedian = median(historicalVariable.map((h) => h.expenses));

  const income = incomeByMonth.map((values) => {
    if (values.length === 0 || overallIncomeMedian === 0) return 1;
    const monthMedian = median(values);
    const ratio = monthMedian / overallIncomeMedian;
    return Math.min(Math.max(Number(ratio.toFixed(3)), 0.5), 1.5);
  });

  const expenses = expensesByMonth.map((values) => {
    if (values.length === 0 || overallExpensesMedian === 0) return 1;
    const monthMedian = median(values);
    const ratio = monthMedian / overallExpensesMedian;
    return Math.min(Math.max(Number(ratio.toFixed(3)), 0.5), 1.5);
  });

  return { income, expenses };
}

function computeVariableHistorical(
  historical: HistoricalMonth[],
  recurring: RecurringTransactionInput[]
): Array<{ month: string; income: number; expenses: number }> {
  return historical.map((h) => {
    const monthStart = startOfMonth(parseISO(`${h.month}-01`));
    const recurringInMonth = projectRecurringForMonth(recurring, monthStart);

    return {
      month: h.month,
      income: Math.max(0, h.income - recurringInMonth.income),
      expenses: Math.max(0, h.expenses - recurringInMonth.expenses),
    };
  });
}

function applyColombianEvents(
  monthStart: Date,
  baseIncome: number,
  baseExpenses: number,
  historicalIncomeMedian: number,
  recurringIncomeInMonth: number,
  config: ColombianEventsConfig
): { income: number; expenses: number; events: string[]; eventIncome: number; eventExpenses: number } {
  const events: string[] = [];
  let eventIncome = 0;
  let eventExpenses = 0;
  const monthIndex = getMonth(monthStart);

  if (config.includeAguinaldo && monthIndex === 11) {
    const bonus = historicalIncomeMedian > 0 ? historicalIncomeMedian : recurringIncomeInMonth;
    eventIncome += bonus;
    events.push(`Aguinaldo estimado: ${formatCurrency(bonus)}`);
  }

  if (config.includePrima && monthIndex === 5) {
    const bonus = historicalIncomeMedian > 0 ? historicalIncomeMedian : recurringIncomeInMonth;
    eventIncome += bonus;
    events.push(`Prima estimada: ${formatCurrency(bonus)}`);
  }

  if (config.includeIvaBimestral && (monthIndex + 1) % 2 === 0) {
    const iva = config.averageMonthlyIva ?? 0;
    if (iva > 0) {
      eventExpenses += iva;
      events.push(`Pago IVA bimestral estimado: ${formatCurrency(iva)}`);
    }
  }

  return {
    income: baseIncome + eventIncome,
    expenses: baseExpenses + eventExpenses,
    events,
    eventIncome,
    eventExpenses,
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildRecommendation(
  riskMonth: string | null,
  lowestBalance: number,
  currentBalance: number
): string {
  if (riskMonth && lowestBalance < 0) {
    return `Tu saldo proyectado caerá por debajo de cero en ${riskMonth}. Reduce gastos variables, posterga compras o busca ingresos adicionales.`;
  }

  if (lowestBalance < currentBalance * 0.1) {
    return `El saldo más bajo es ${formatCurrency(lowestBalance)} en ${riskMonth ?? "el horizonte"}; mantén una reserva de emergencia.`;
  }

  if (lowestBalance >= currentBalance) {
    return "La proyección es saludable; tu saldo crece en todos los escenarios. Mantén el ritmo de ahorro.";
  }

  return "La proyección es estable. Sigue monitoreando gastos recurrentes y eventos estacionales.";
}

export function generateCashflowProjection({
  currentBalance,
  historical,
  recurring,
  monthsToProject = 12,
  colombianEvents = {},
  scenarioConfig = DEFAULT_SCENARIO_CONFIG,
  referenceDate = new Date(),
}: {
  currentBalance: number;
  historical: HistoricalMonth[];
  recurring: RecurringTransactionInput[];
  monthsToProject?: number;
  colombianEvents?: ColombianEventsConfig;
  scenarioConfig?: ScenarioConfig;
  referenceDate?: Date;
}): CashflowProjection {
  const horizon = Math.min(Math.max(monthsToProject, 3), MAX_MONTHS);
  const startDate = startOfMonth(referenceDate);

  const sortedHistorical = [...historical].sort(
    (a, b) => parseISO(`${a.month}-01`).getTime() - parseISO(`${b.month}-01`).getTime()
  );

  const historicalVariable = computeVariableHistorical(sortedHistorical, recurring);
  const historicalIncomeMedian = median(sortedHistorical.map((h) => h.income));

  const incomeValues = historicalVariable.map((h) => h.income);
  const expenseValues = historicalVariable.map((h) => h.expenses);

  const incomeRegression = linearRegression(incomeValues);
  const expenseRegression = linearRegression(expenseValues);

  const seasonalIndices =
    historicalVariable.length > 0
      ? buildSeasonalIndices(historicalVariable)
      : { income: Array.from({ length: 12 }, () => 1), expenses: Array.from({ length: 12 }, () => 1) };

  const projection: ProjectionMonth[] = [];
  let baseBalance = currentBalance;
  let optimisticBalance = currentBalance;
  let pessimisticBalance = currentBalance;

  const historicalLength = historicalVariable.length;

  for (let i = 1; i <= horizon; i++) {
    const monthStart = addMonths(startDate, i);
    const monthKey = format(monthStart, "yyyy-MM");
    const monthIndex = getMonth(monthStart);

    const recurringInMonth = projectRecurringForMonth(recurring, monthStart);

    const x = historicalLength > 0 ? historicalLength - 1 + i : i;

    const projectedVariableIncome = Math.max(
      0,
      (incomeRegression.intercept + incomeRegression.slope * x) * seasonalIndices.income[monthIndex]
    );
    const projectedVariableExpenses = Math.max(
      0,
      (expenseRegression.intercept + expenseRegression.slope * x) * seasonalIndices.expenses[monthIndex]
    );

    const baseIncome = projectedVariableIncome + recurringInMonth.income;
    const baseExpenses = projectedVariableExpenses + recurringInMonth.expenses;

    const eventData = applyColombianEvents(
      monthStart,
      baseIncome,
      baseExpenses,
      historicalIncomeMedian,
      recurringInMonth.income,
      colombianEvents
    );

    const totalIncome = eventData.income;
    const totalExpenses = eventData.expenses;
    const net = totalIncome - totalExpenses;

    const optimisticIncome = totalIncome * scenarioConfig.optimistic.incomeMultiplier;
    const optimisticExpenses = totalExpenses * scenarioConfig.optimistic.expenseMultiplier;
    const optimisticNet = optimisticIncome - optimisticExpenses;

    const pessimisticIncome = totalIncome * scenarioConfig.pessimistic.incomeMultiplier;
    const pessimisticExpenses = totalExpenses * scenarioConfig.pessimistic.expenseMultiplier;
    const pessimisticNet = pessimisticIncome - pessimisticExpenses;

    baseBalance += net;
    optimisticBalance += optimisticNet;
    pessimisticBalance += pessimisticNet;

    projection.push({
      month: monthKey,
      monthIndex,
      baseIncome: Math.round(totalIncome),
      baseExpenses: Math.round(totalExpenses),
      recurringIncome: Math.round(recurringInMonth.income),
      recurringExpenses: Math.round(recurringInMonth.expenses),
      variableIncome: Math.round(projectedVariableIncome),
      variableExpenses: Math.round(projectedVariableExpenses),
      eventIncome: Math.round(eventData.eventIncome),
      eventExpenses: Math.round(eventData.eventExpenses),
      net: Math.round(net),
      baseBalance: Math.round(baseBalance),
      optimisticBalance: Math.round(optimisticBalance),
      pessimisticBalance: Math.round(pessimisticBalance),
      events: eventData.events,
    });
  }

  const final = projection[projection.length - 1];
  const finalBaseBalance = final?.baseBalance ?? currentBalance;
  const finalOptimisticBalance = final?.optimisticBalance ?? currentBalance;
  const finalPessimisticBalance = final?.pessimisticBalance ?? currentBalance;

  const riskEntry = projection.reduce<ProjectionMonth | null>((min, entry) => {
    if (!min || entry.baseBalance < min.baseBalance) return entry;
    return min;
  }, null);

  const riskMonth = riskEntry && riskEntry.baseBalance < currentBalance ? riskEntry.month : null;
  const lowestBalance = riskEntry?.baseBalance ?? currentBalance;

  const averageMonthlyNet = projection.length > 0
    ? projection.reduce((sum, p) => sum + p.net, 0) / projection.length
    : 0;

  return {
    projection,
    summary: {
      currentBalance,
      monthsToProject: horizon,
      finalBaseBalance,
      finalOptimisticBalance,
      finalPessimisticBalance,
      riskMonth,
      lowestBalance,
      averageMonthlyNet: Math.round(averageMonthlyNet),
      recommendation: buildRecommendation(riskMonth, lowestBalance, currentBalance),
    },
  };
}

export { DEFAULT_SCENARIO_CONFIG };
