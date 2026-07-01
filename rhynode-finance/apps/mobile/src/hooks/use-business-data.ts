import { useQuery } from '@tanstack/react-query';
import { type ZodType } from 'zod';
import { useApi } from './use-api';

export type BusinessDataType = 'invoices' | 'clients' | 'projects';

export function useBusinessData<T>(type: BusinessDataType, schema?: ZodType<T>) {
  const api = useApi();

  return useQuery<T>({
    queryKey: ['business', type],
    queryFn: () => api.get(`/api/mobile/business-data?type=${type}`, schema),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
