import { z } from 'zod';

export const transactionSchema = z.object({
  id: z.string(),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().nullable(),
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  date: z.string(),
});

export type Transaction = z.infer<typeof transactionSchema>;

export const transactionDetailSchema = z.object({
  id: z.string(),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().nullable(),
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  date: z.string(),
  accountName: z.string().nullable(),
  bankAccountName: z.string().nullable(),
  organizationName: z.string(),
});

export type TransactionDetail = z.infer<typeof transactionDetailSchema>;

export const transactionsResponseSchema = z.object({
  transactions: z.array(transactionSchema),
  nextCursor: z.string().nullable().optional(),
});

export const transactionMutationResponseSchema = z.object({
  transaction: z.union([transactionSchema, transactionDetailSchema]),
});

export const deleteTransactionResponseSchema = z.object({
  success: z.boolean(),
});

export const transactionDetailResponseSchema = z.object({
  transaction: transactionDetailSchema,
});
export type TransactionDetailResponse = z.infer<typeof transactionDetailResponseSchema>;

export const updateTransactionResponseSchema = transactionDetailResponseSchema;
export type UpdateTransactionResponse = z.infer<typeof updateTransactionResponseSchema>;

export const createTransactionBodySchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().optional(),
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().optional(),
  date: z.string().datetime().optional(),
  accountId: z.string().optional(),
  bankAccountId: z.string().optional(),
});
export type CreateTransactionBody = z.infer<typeof createTransactionBodySchema>;

export const updateTransactionBodySchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.string().optional(),
  description: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  date: z.string().optional(),
  accountId: z.string().optional(),
  bankAccountId: z.string().optional(),
});

export type UpdateTransactionBody = z.infer<typeof updateTransactionBodySchema>;
