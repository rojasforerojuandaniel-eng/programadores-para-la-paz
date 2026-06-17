import { z } from "zod";

export const FinancialHealthSchema = z.enum(["saludable", "alerta", "crítica"]);
export const TrendSchema = z.enum(["up", "down", "stable"]);

export const FinancialInsightsSchema = z.object({
  financialHealth: FinancialHealthSchema,
  topCategory: z
    .object({
      name: z.string(),
      amount: z.number(),
    })
    .nullable(),
  savingsRate: z.number(),
  trend: TrendSchema,
  recommendations: z.array(z.string()),
});

export type FinancialInsights = z.infer<typeof FinancialInsightsSchema>;
