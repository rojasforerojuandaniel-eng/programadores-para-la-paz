import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';
import { hapticNotification } from '~/lib/haptics';
import {
  transactionSchema,
  transactionsResponseSchema,
  transactionMutationResponseSchema,
  type Transaction,
} from '~/schemas/transaction';

export type { Transaction };

export function useTransactions() {
  const api = useApi();

  return useQuery<{ transactions: Transaction[] }>({
    queryKey: ['transactions', 'personal'],
    queryFn: () => api.get('/api/personal/transactions', transactionsResponseSchema),
    retry: 2,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useCreateTransaction() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Omit<Transaction, 'id'>) =>
      api.post('/api/personal/transactions', body, transactionMutationResponseSchema),
    onSuccess: () => {
      void hapticNotification();
      void queryClient.invalidateQueries({ queryKey: ['transactions', 'personal'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}
