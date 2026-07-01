import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApi } from './use-api';
import {
  businessDataSchemaMap,
  type BusinessDataResponseMap,
  type BusinessDataType,
} from '~/schemas/business-data';

export type { BusinessDataType };

export function useBusinessData<TType extends BusinessDataType>(
  type: TType
): UseQueryResult<BusinessDataResponseMap[TType]> {
  const api = useApi();
  const schema = businessDataSchemaMap[type];

  return useQuery({
    queryKey: ['business', type],
    queryFn: () => api.get(`/api/mobile/business-data?type=${type}`, schema),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
