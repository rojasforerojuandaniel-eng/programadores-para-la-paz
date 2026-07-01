import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useApi } from './use-api';
import { hapticNotification } from '~/lib/haptics';

const transactionDetailSchema = z.object({
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

const updateBodySchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.string().optional(),
  description: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  date: z.string().optional(),
  accountId: z.string().optional(),
  bankAccountId: z.string().optional(),
});

export type UpdateTransactionBody = z.infer<typeof updateBodySchema>;

export function useTransaction(id: string | undefined) {
  const api = useApi();

  return useQuery<TransactionDetail>({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const response = await api.get<{ transaction: unknown }>(`/api/personal/transactions/${id}`);
      return transactionDetailSchema.parse(response.transaction);
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDeleteTransaction() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) =>
      api.delete<{ success: boolean }>(`/api/personal/transactions/${transactionId}`),
    onSuccess: (_, transactionId) => {
      void hapticNotification();
      void queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      void queryClient.invalidateQueries({ queryKey: ['transactions', 'personal'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export function useUpdateTransaction() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, body }: { transactionId: string; body: UpdateTransactionBody }) =>
      api.patch<{ transaction: unknown }>(`/api/personal/transactions/${transactionId}`, body),
    onSuccess: (response, { transactionId }) => {
      void hapticNotification();
      const transaction = transactionDetailSchema.parse(response.transaction);
      queryClient.setQueryData(['transaction', transactionId], transaction);
      void queryClient.invalidateQueries({ queryKey: ['transactions', 'personal'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}
