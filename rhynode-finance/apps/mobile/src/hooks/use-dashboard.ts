import { useQuery } from '@tanstack/react-query';
import { useApi } from './use-api';
import { dashboardSummarySchema, type DashboardSummary } from '~/schemas/dashboard';

export function useDashboardSummary() {
  const api = useApi();

  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.get('/api/dashboard/summary', dashboardSummarySchema),
    retry: 2,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
