import { useAuth } from '@clerk/clerk-expo';
import { createApiClient, type ApiClient } from '~/lib/api';
import { useMemo } from 'react';

export function useApi(): ApiClient {
  const { getToken } = useAuth();

  return useMemo(() => {
    const getTokenAsync = async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    };

    return {
      get: async <T>(path: string) => {
        const token = await getTokenAsync();
        return createApiClient(token).get<T>(path);
      },
      post: async <T>(path: string, body: unknown) => {
        const token = await getTokenAsync();
        return createApiClient(token).post<T>(path, body);
      },
      patch: async <T>(path: string, body: unknown) => {
        const token = await getTokenAsync();
        return createApiClient(token).patch<T>(path, body);
      },
      delete: async <T>(path: string) => {
        const token = await getTokenAsync();
        return createApiClient(token).delete<T>(path);
      },
    };
  }, [getToken]);
}
