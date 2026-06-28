import { z } from "zod";

export const transactionTypeSchema = z.enum(["income", "expense"]);

export const transactionSchema = z.object({
  id: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  type: transactionTypeSchema,
  categoryId: z.string().min(1, "Category is required"),
  accountId: z.string().min(1, "Account is required"),
  description: z.string().min(1, "Description is required").max(200),
  date: z.string().datetime(),
  currency: z.string().default("COP"),
});

export const transactionFormSchema = transactionSchema.omit({ id: true });

export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionFormInput = z.infer<typeof transactionFormSchema>;
export type TransactionType = z.infer<typeof transactionTypeSchema>;
