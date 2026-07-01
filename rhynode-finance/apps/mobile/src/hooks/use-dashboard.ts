import { useQuery } from '@tanstack/react-query';
import { useApi } from './use-api';

export interface DashboardSummary {
  totalBalance: number;
  income: number;
  expense: number;
  upcomingItems: Array<{
    id: string;
    title: string;
    amount: number;
    dueDate: string | null;
    type: 'debt' | 'goal';
  }>;
  healthScore: number;
  currency: string;
}

export function useDashboardSummary() {
  const api = useApi();

  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.get('/api/dashboard/summary'),
    retry: 2,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
