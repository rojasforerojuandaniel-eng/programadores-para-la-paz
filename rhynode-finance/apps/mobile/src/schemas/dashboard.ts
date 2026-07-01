import { z } from 'zod';

export const upcomingItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.number(),
  dueDate: z.string().nullable(),
  type: z.enum(['debt', 'goal']),
});

export const dashboardSummarySchema = z.object({
  totalBalance: z.number(),
  income: z.number(),
  expense: z.number(),
  upcomingItems: z.array(upcomingItemSchema),
  healthScore: z.number(),
  currency: z.string(),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatHistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const chatHistorySchema = z.array(chatHistoryItemSchema);

export const ocrItemSchema = z.object({
  description: z.string(),
  amount: z.number(),
});

export const ocrResultSchema = z.object({
  merchant: z.string(),
  total: z.number(),
  date: z.string(),
  items: z.array(ocrItemSchema),
  confidence: z.number(),
});

export type OcrResult = z.infer<typeof ocrResultSchema>;

export const uploadReceiptResponseSchema = z.object({
  url: z.string(),
});
