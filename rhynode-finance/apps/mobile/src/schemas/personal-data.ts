import { z, type ZodType } from 'zod';

export const accountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  type: z.string(),
  balance: z.coerce.number(),
  currency: z.string(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  provider: z.string().nullable().optional(),
  externalId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Account = z.infer<typeof accountSchema>;

export const categorySchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  name: z.string(),
  type: z.string().optional(),
  parentId: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});
export type Category = z.infer<typeof categorySchema>;

export const budgetSchema = z.object({
  id: z.string(),
  userId: z.string(),
  categoryId: z.string().nullable().optional(),
  name: z.string(),
  amount: z.coerce.number(),
  period: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable().optional(),
  spent: z.coerce.number(),
  rollover: z.boolean().optional(),
  alertThreshold: z.number().nullable().optional(),
  currency: z.string().default('COP'),
  category: categorySchema.nullable().optional(),
});
export type Budget = z.infer<typeof budgetSchema>;

export const goalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  targetAmount: z.coerce.number(),
  currentAmount: z.coerce.number(),
  currency: z.string(),
  deadline: z.string().datetime().nullable(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  status: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type Goal = z.infer<typeof goalSchema>;

export const debtSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  type: z.string(),
  counterparty: z.string().nullable().optional(),
  principalAmount: z.coerce.number(),
  interestRate: z.number().nullable().optional(),
  remainingAmount: z.coerce.number(),
  currency: z.string(),
  dueDate: z.string().datetime().nullable(),
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type Debt = z.infer<typeof debtSchema>;

export const recurringSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  amount: z.coerce.number(),
  type: z.string(),
  categoryId: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
  frequency: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable().optional(),
  nextDueDate: z.string().datetime(),
  lastGeneratedAt: z.string().datetime().nullable().optional(),
  isSubscription: z.boolean().optional(),
  provider: z.string().nullable().optional(),
  status: z.string().optional(),
  currency: z.string().default('COP'),
});
export type Recurring = z.infer<typeof recurringSchema>;

export const subscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  amount: z.coerce.number(),
  currency: z.string(),
  frequency: z.string(),
  provider: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  status: z.string().optional(),
  canceledAt: z.string().datetime().nullable().optional(),
  cancellationUrl: z.string().nullable().optional(),
  lastDetectedAt: z.string().datetime().optional(),
  lastPaidAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;

export const accountsResponseSchema = z.object({ accounts: z.array(accountSchema) });
export type AccountsResponse = z.infer<typeof accountsResponseSchema>;

export const budgetsResponseSchema = z.object({ budgets: z.array(budgetSchema) });
export type BudgetsResponse = z.infer<typeof budgetsResponseSchema>;

export const goalsResponseSchema = z.object({ goals: z.array(goalSchema) });
export type GoalsResponse = z.infer<typeof goalsResponseSchema>;

export const debtsResponseSchema = z.object({ debts: z.array(debtSchema) });
export type DebtsResponse = z.infer<typeof debtsResponseSchema>;

export const recurringResponseSchema = z.object({ recurring: z.array(recurringSchema) });
export type RecurringResponse = z.infer<typeof recurringResponseSchema>;

export const subscriptionsResponseSchema = z.object({ subscriptions: z.array(subscriptionSchema) });
export type SubscriptionsResponse = z.infer<typeof subscriptionsResponseSchema>;

export const categoriesResponseSchema = z.object({ categories: z.array(categorySchema) });
export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;

export const calendarResponseSchema = z.object({
  debts: z.array(debtSchema),
  goals: z.array(goalSchema),
  recurring: z.array(recurringSchema),
});
export type CalendarResponse = z.infer<typeof calendarResponseSchema>;

export type PersonalDataResponseMap = {
  accounts: AccountsResponse;
  budgets: BudgetsResponse;
  goals: GoalsResponse;
  debts: DebtsResponse;
  recurring: RecurringResponse;
  subscriptions: SubscriptionsResponse;
  calendar: CalendarResponse;
  categories: CategoriesResponse;
};

export type PersonalDataType = keyof PersonalDataResponseMap;

export const personalDataSchemaMap: {
  [K in PersonalDataType]: ZodType<PersonalDataResponseMap[K]>;
} = {
  accounts: accountsResponseSchema,
  budgets: budgetsResponseSchema,
  goals: goalsResponseSchema,
  debts: debtsResponseSchema,
  recurring: recurringResponseSchema,
  subscriptions: subscriptionsResponseSchema,
  calendar: calendarResponseSchema,
  categories: categoriesResponseSchema,
};
