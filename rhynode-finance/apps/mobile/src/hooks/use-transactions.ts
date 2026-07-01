import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';
import { hapticNotification } from '~/lib/haptics';

export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string | null;
  description: string;
  amount: number;
  currency: string;
  date: string;
}

export function useTransactions() {
  const api = useApi();

  return useQuery<{ transactions: Transaction[] }>({
    queryKey: ['transactions', 'personal'],
    queryFn: () => api.get('/api/personal/transactions'),
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
    mutationFn: (body: Omit<Transaction, 'id'>) => api.post('/api/personal/transactions', body),
    onSuccess: () => {
      void hapticNotification();
      void queryClient.invalidateQueries({ queryKey: ['transactions', 'personal'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}
