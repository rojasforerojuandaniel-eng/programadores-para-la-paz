import { useQuery } from '@tanstack/react-query';
import { type ZodType } from 'zod';
import { useApi } from './use-api';

export type PersonalDataType =
  | 'accounts'
  | 'budgets'
  | 'goals'
  | 'debts'
  | 'recurring'
  | 'subscriptions'
  | 'calendar'
  | 'categories';

export function usePersonalData<T>(type: PersonalDataType, key?: string, schema?: ZodType<T>) {
  const api = useApi();

  return useQuery<T>({
    queryKey: ['personal', type, key],
    queryFn: () => api.get(`/api/mobile/personal-data?type=${type}`, schema),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
