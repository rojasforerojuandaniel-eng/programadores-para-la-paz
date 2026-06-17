type DecimalLike = number | string | null | undefined;

function toNumber(value: DecimalLike): number {
  return Number(value ?? 0);
}

export interface BudgetInput {
  amount: DecimalLike;
  spent: DecimalLike;
}

export interface DebtInput {
  principalAmount: DecimalLike;
  remainingAmount: DecimalLike;
}

export interface GoalInput {
  currentAmount: DecimalLike;
  targetAmount: DecimalLike;
}

export interface AccountInput {
  balance: DecimalLike;
  type?: string | null;
}

export interface InvestmentInput {
  investmentType: string;
  balance: DecimalLike;
  investedAmount: DecimalLike;
}

export interface TransactionInput {
  amount: DecimalLike;
  type: "INCOME" | "EXPENSE" | string;
  category?: string | null;
}

export interface HealthScoreInputs {
  income: DecimalLike;
  expense: DecimalLike;
  transactions?: TransactionInput[];
  debts?: DebtInput[];
  budgets?: BudgetInput[];
  goals?: GoalInput[];
  accounts?: AccountInput[];
  investments?: InvestmentInput[];
}

export interface HealthFactor {
  id: string;
  name: string;
  score: number;
  weight: number;
  description: string;
}

export interface HealthRecommendation {
  priority: number;
  factorId: string;
  title: string;
  description: string;
  action: string;
}

export interface HealthScoreResult {
  overallScore: number;
  grade: string;
  factors: HealthFactor[];
  recommendations: HealthRecommendation[];
}

const FACTOR_WEIGHTS = {
  savings: 0.25,
  debt: 0.2,
  liquidity: 0.2,
  budget: 0.2,
  diversification: 0.15,
} as const;

const FACTOR_DESCRIPTIONS: Record<string, string> = {
  savings:
    "Capacidad de ahorro medida como porcentaje de ingresos que queda libre después de gastos.",
  debt: "Nivel de endeudamiento en relación con los ingresos y progreso de amortización.",
  liquidity:
    "Reserva de efectivo disponible para cubrir gastos sin recurrir a deuda.",
  budget: "Cumplimiento de los límites definidos en presupuestos mensuales.",
  diversification:
    "Distribución del patrimonio entre múltiples cuentas e instrumentos de inversión.",
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value);
}

export function calculateSavingsScore(income: number, expense: number): number {
  if (income <= 0) {
    return expense <= 0 ? 100 : 0;
  }
  const rate = (income - expense) / income;
  // 50% de ahorro es ideal; escala lineal hasta ese punto.
  return clamp(round(rate * 200));
}

export function calculateDebtScore(
  income: number,
  debts: DebtInput[]
): number {
  if (debts.length === 0) return 100;

  const totalRemaining = debts.reduce(
    (sum, d) => sum + toNumber(d.remainingAmount),
    0
  );
  const totalPrincipal = debts.reduce(
    (sum, d) => sum + toNumber(d.principalAmount),
    0
  );

  // Progreso de amortización: 0% restante => 100, 100% restante => 0.
  const amortizationProgress =
    totalPrincipal <= 0
      ? totalRemaining <= 0
        ? 1
        : 0
      : 1 - totalRemaining / totalPrincipal;

  // Carga de deuda vs ingresos mensuales: ideal < 20%.
  const debtToIncomeRatio = income > 0 ? totalRemaining / income : 1;
  const debtLoadScore = clamp(100 - debtToIncomeRatio * 100);

  const amortizationScore = clamp(round(amortizationProgress * 100));

  return round(amortizationScore * 0.6 + debtLoadScore * 0.4);
}

export function calculateLiquidityScore(
  balance: number,
  expense: number
): number {
  if (expense <= 0) {
    return balance > 0 ? 100 : 50;
  }
  // Meta: 6 meses de gastos cubiertos = 100.
  const months = balance / expense;
  return clamp(round((months / 6) * 100));
}

export function calculateBudgetScore(budgets: BudgetInput[]): number {
  if (budgets.length === 0) return 100;

  const scores = budgets.map((b) => {
    const amount = toNumber(b.amount);
    if (amount <= 0) return 100;
    const ratio = toNumber(b.spent) / amount;
    // 0% gastado => 100, 100% => 100, 150% => 50, 200%+ => 0.
    return clamp(100 - Math.max(0, ratio - 1) * 100);
  });

  return round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

export function calculateDiversificationScore(
  accounts: AccountInput[],
  investments: InvestmentInput[]
): number {
  const hasInvestments = (investments?.length ?? 0) > 0;
  const hasAccounts = (accounts?.length ?? 0) > 0;

  if (!hasInvestments && !hasAccounts) return 50;

  // Diversificación por tipo de inversión usando índice HHI.
  if (hasInvestments) {
    const totalInvested = investments!.reduce(
      (sum, inv) => sum + toNumber(inv.investedAmount),
      0
    );
    if (totalInvested <= 0) {
      // Sin inversión efectiva, medimos por cantidad de cuentas líquidas.
      return hasAccounts ? clamp(accounts!.length * 25) : 50;
    }

    const typeTotals = new Map<string, number>();
    for (const inv of investments!) {
      const amount = toNumber(inv.investedAmount);
      typeTotals.set(
        inv.investmentType,
        (typeTotals.get(inv.investmentType) ?? 0) + amount
      );
    }

    let hhi = 0;
    for (const amount of typeTotals.values()) {
      const share = amount / totalInvested;
      hhi += share * share;
    }

    // HHI 1 (todo concentrado) => 0, HHI bajo => 100. Bonificar cantidad de tipos.
    const concentrationScore = (1 - hhi) * 100;
    const typeCountBonus = typeTotals.size * 6;

    return clamp(round(concentrationScore + typeCountBonus));
  }

  // Fallback: cantidad de cuentas.
  return clamp(accounts!.length * 25);
}

export function calculateHealthScore(inputs: HealthScoreInputs): HealthScoreResult {
  const income = toNumber(inputs.income);
  const expense = toNumber(inputs.expense);

  const savingsScore = calculateSavingsScore(income, expense);

  const debts = inputs.debts ?? [];
  const debtScore = calculateDebtScore(income, debts);

  const liquidBalance = (inputs.accounts ?? []).reduce(
    (sum, a) => sum + toNumber(a.balance),
    0
  );
  const liquidityScore = calculateLiquidityScore(liquidBalance, expense);

  const budgets = inputs.budgets ?? [];
  const budgetScore = calculateBudgetScore(budgets);

  const diversificationScore = calculateDiversificationScore(
    inputs.accounts ?? [],
    inputs.investments ?? []
  );

  const factors: HealthFactor[] = [
    {
      id: "savings",
      name: "Ahorro",
      score: savingsScore,
      weight: FACTOR_WEIGHTS.savings,
      description: FACTOR_DESCRIPTIONS.savings,
    },
    {
      id: "debt",
      name: "Deuda",
      score: debtScore,
      weight: FACTOR_WEIGHTS.debt,
      description: FACTOR_DESCRIPTIONS.debt,
    },
    {
      id: "liquidity",
      name: "Liquidez",
      score: liquidityScore,
      weight: FACTOR_WEIGHTS.liquidity,
      description: FACTOR_DESCRIPTIONS.liquidity,
    },
    {
      id: "budget",
      name: "Presupuestos",
      score: budgetScore,
      weight: FACTOR_WEIGHTS.budget,
      description: FACTOR_DESCRIPTIONS.budget,
    },
    {
      id: "diversification",
      name: "Diversificación",
      score: diversificationScore,
      weight: FACTOR_WEIGHTS.diversification,
      description: FACTOR_DESCRIPTIONS.diversification,
    },
  ];

  const weightedSum = factors.reduce(
    (sum, f) => sum + f.score * f.weight,
    0
  );
  const overallScore = round(weightedSum);
  const grade = getGrade(overallScore);

  const recommendations = buildRecommendations(factors, {
    income,
    expense,
    liquidBalance,
    totalDebt: debts.reduce((sum, d) => sum + toNumber(d.remainingAmount), 0),
    investmentCount: (inputs.investments ?? []).length,
  });

  return {
    overallScore,
    grade,
    factors,
    recommendations,
  };
}

export function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function getScoreColorClass(score: number): string {
  if (score >= 90) return "text-emerald-400";
  if (score >= 80) return "text-green-400";
  if (score >= 70) return "text-yellow-400";
  if (score >= 60) return "text-orange-400";
  return "text-red-400";
}

export function getScoreBackgroundClass(score: number): string {
  if (score >= 90) return "bg-emerald-400";
  if (score >= 80) return "bg-green-400";
  if (score >= 70) return "bg-yellow-400";
  if (score >= 60) return "bg-orange-400";
  return "bg-red-400";
}

interface RecommendationContext {
  income: number;
  expense: number;
  liquidBalance: number;
  totalDebt: number;
  investmentCount: number;
}

function buildRecommendations(
  factors: HealthFactor[],
  ctx: RecommendationContext
): HealthRecommendation[] {
  const sorted = [...factors]
    .filter((f) => f.score < 85)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  if (sorted.length === 0) {
    return [
      {
        priority: 1,
        factorId: "overall",
        title: "¡Excelente salud financiera!",
        description:
          "Todos tus factores están por encima de 85. Mantén el ritmo y revisa periódicamente.",
        action: "Programa una revisión mensual de tus metas.",
      },
    ];
  }

  return sorted.map((factor, index) => {
    const rec = recommendationForFactor(factor.id, factor.score, ctx);
    return { ...rec, priority: index + 1, factorId: factor.id };
  });
}

function recommendationForFactor(
  factorId: string,
  _score: number,
  ctx: RecommendationContext
): Omit<HealthRecommendation, "priority" | "factorId"> {
  switch (factorId) {
    case "savings": {
      const savingsRate = ctx.income > 0 ? ((ctx.income - ctx.expense) / ctx.income) * 100 : 0;
      return {
        title: "Aumenta tu tasa de ahorro",
        description: `Actualmente ahorras el ${savingsRate.toFixed(1)}% de tus ingresos. El ideal mínimo es 20%.`,
        action:
          "Revisa gastos hormiga y suscripciones; automatiza una transferencia de nómina a ahorros.",
      };
    }
    case "debt": {
      const debtRatio =
        ctx.income > 0 ? ((ctx.totalDebt / ctx.income) * 100).toFixed(1) : "N/A";
      return {
        title: "Reduce tu carga de deuda",
        description: `Tu deuda pendiente representa el ${debtRatio}% de tus ingresos mensuales.`,
        action:
          "Prioriza pagar deudas con mayor interés (avalancha) o consolida pagos para reducir la carga.",
      };
    }
    case "liquidity": {
      const months = ctx.expense > 0 ? ctx.liquidBalance / ctx.expense : 0;
      return {
        title: "Fortalece tu colchón de liquidez",
        description: `Cuentas con ${months.toFixed(1)} meses de gastos cubiertos. Se recomiendan al menos 3-6.`,
        action:
          "Destina un porcentaje fijo de ingresos a una cuenta de emergencia hasta alcanzar 6 meses.",
      };
    }
    case "budget": {
      return {
        title: "Revisa tus presupuestos",
        description:
          "Algunos presupuestos están sobre pasados. Identifica las categorías que más se desvían.",
        action:
          "Ajusta los límites a niveles realistas y configura alertas antes de completar el 80% de gasto.",
      };
    }
    case "diversification": {
      return {
        title: "Diversifica tu patrimonio",
        description:
          "Tienes alta concentración en pocas cuentas o tipos de inversión, lo que aumenta el riesgo.",
        action:
          ctx.investmentCount === 0
            ? "Abre una segunda cuenta de ahorros o inversión con objetivo distinto."
            : "Rebalancea entre clases de activos (renta fija, variable, liquidez).",
      };
    }
    default:
      return {
        title: "Revisa este indicador",
        description: "Hay margen de mejora en este factor.",
        action: "Profundiza en la sección correspondiente del dashboard.",
      };
  }
}
