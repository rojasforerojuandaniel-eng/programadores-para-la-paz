import { useQuery } from '@tanstack/react-query';
import { useApi } from './use-api';

export type BusinessDataType = 'invoices' | 'clients' | 'projects';

export function useBusinessData<T>(type: BusinessDataType) {
  const api = useApi();

  return useQuery<T>({
    queryKey: ['business', type],
    queryFn: () => api.get(`/api/mobile/business-data?type=${type}`),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
