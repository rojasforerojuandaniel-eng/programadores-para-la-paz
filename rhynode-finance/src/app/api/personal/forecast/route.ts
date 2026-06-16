import { decimalToNumber } from "@/lib/decimal";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { TransactionWhereInput } from "@/generated/prisma/models/Transaction";
import { getUserProfile, getOrCreateAuthOrg } from "@/lib/auth";
import { subMonths, addMonths, format } from "date-fns";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

interface ForecastData extends MonthlyData {
  confidence: number;
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };

  const sumX = values.reduce((sum, _, i) => sum + i, 0);
  const sumY = values.reduce((sum, v) => sum + v, 0);
  const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
  const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getOrCreateAuthOrg();
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);

    const txnWhere: TransactionWhereInput = {
      organizationId: org.id,
      scope: "PERSONAL",
      date: { gte: sixMonthsAgo },
      OR: [{ userId: profile.id }, { userId: null }],
    };

    const transactions = await prisma.transaction.findMany({
      where: txnWhere,
      orderBy: { date: "asc" },
    });

    const monthlyMap = new Map<string, { income: number; expenses: number }>();

    for (const t of transactions) {
      const monthKey = format(t.date, "yyyy-MM");
      const current = monthlyMap.get(monthKey) || { income: 0, expenses: 0 };

      if (t.type === "INCOME") {
        current.income += decimalToNumber(t.amount);
      } else if (t.type === "EXPENSE") {
        current.expenses += Math.abs(decimalToNumber(t.amount));
      }

      monthlyMap.set(monthKey, current);
    }

    const historical: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthKey = format(monthDate, "yyyy-MM");
      const data = monthlyMap.get(monthKey) || { income: 0, expenses: 0 };
      historical.push({ month: monthKey, income: data.income, expenses: data.expenses });
    }

    const incomeValues = historical.map((h) => h.income);
    const expenseValues = historical.map((h) => h.expenses);

    const incomeRegression = linearRegression(incomeValues);
    const expenseRegression = linearRegression(expenseValues);

    const forecast: ForecastData[] = [];
    for (let i = 1; i <= 3; i++) {
      const projectedIncome =
        incomeRegression.intercept +
        incomeRegression.slope * (incomeValues.length - 1 + i);
      const projectedExpenses =
        expenseRegression.intercept +
        expenseRegression.slope * (expenseValues.length - 1 + i);

      const monthDate = addMonths(now, i);
      const monthKey = format(monthDate, "yyyy-MM");

      forecast.push({
        month: monthKey,
        income: Math.max(0, Math.round(projectedIncome)),
        expenses: Math.max(0, Math.round(projectedExpenses)),
        confidence: 0.75 - i * 0.05,
      });
    }

    const insights: string[] = [];

    const firstMonthExpenses = expenseValues[0] || 0;
    const lastMonthExpenses = expenseValues[expenseValues.length - 1] || 0;

    if (firstMonthExpenses > 0) {
      const expenseGrowth =
        ((lastMonthExpenses - firstMonthExpenses) / firstMonthExpenses) * 100;
      if (Math.abs(expenseGrowth) > 1) {
        insights.push(
          `Tus gastos han ${expenseGrowth > 0 ? "crecido" : "disminuido"} un ${Math.abs(expenseGrowth).toFixed(1)}% en promedio respecto al inicio del período`
        );
      }
    }

    const nextMonth = forecast[0];
    if (nextMonth) {
      const surplus = nextMonth.income - nextMonth.expenses;
      if (surplus > 0) {
        insights.push(
          `Se proyecta un superávit de $${surplus.toLocaleString("es-CO")} para ${nextMonth.month}`
        );
      } else {
        insights.push(
          `Se proyecta un déficit de $${Math.abs(surplus).toLocaleString("es-CO")} para ${nextMonth.month}`
        );
      }
    }

    if (incomeRegression.slope > 0) {
      insights.push("Tus ingresos muestran una tendencia al alza");
    } else if (incomeRegression.slope < 0) {
      insights.push("Tus ingresos muestran una tendencia a la baja");
    }

    return NextResponse.json({
      historical,
      forecast,
      insights,
    });
  } catch (error) {
    console.error("Failed to generate forecast:", error);
    return NextResponse.json(
      { error: "Failed to generate forecast" },
      { status: 500 }
    );
  }
}
