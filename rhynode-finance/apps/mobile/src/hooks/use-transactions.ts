import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';

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
  });
}

export function useCreateTransaction() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Omit<Transaction, 'id'>) => api.post('/api/personal/transactions', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'personal'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}
