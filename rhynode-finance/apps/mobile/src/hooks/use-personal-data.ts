import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApi } from './use-api';
import {
  personalDataSchemaMap,
  type PersonalDataResponseMap,
  type PersonalDataType,
} from '~/schemas/personal-data';

export type { PersonalDataType };

export function usePersonalData<TType extends PersonalDataType>(
  type: TType
): UseQueryResult<PersonalDataResponseMap[TType]> {
  const api = useApi();
  const schema = personalDataSchemaMap[type];

  return useQuery({
    queryKey: ['personal', type],
    queryFn: () => api.get(`/api/mobile/personal-data?type=${type}`, schema),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
