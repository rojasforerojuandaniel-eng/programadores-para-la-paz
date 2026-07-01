import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { z, type ZodType } from 'zod';
import { createApiClient, type ApiClient, AuthError } from '~/lib/api';

export function useApi(): ApiClient {
  const { getToken } = useAuth();
  const router = useRouter();

  return useMemo(() => {
    const getAuthToken = async (): Promise<string> => {
      let token: string | null;

      try {
        token = await getToken();
      } catch (error) {
        router.replace('/(auth)/sign-in');
        throw new AuthError('Failed to refresh authentication token', error);
      }

      if (!token) {
        router.replace('/(auth)/sign-in');
        throw new AuthError('Authentication required');
      }

      return token;
    };

    return {
      get: async <T>(path: string, schema?: ZodType<T>) => {
        const token = await getAuthToken();
        return createApiClient(token).get<T>(path, schema);
      },
      post: async <T>(path: string, body: unknown, schema?: ZodType<T>) => {
        const token = await getAuthToken();
        return createApiClient(token).post<T>(path, body, schema);
      },
      patch: async <T>(path: string, body: unknown, schema?: ZodType<T>) => {
        const token = await getAuthToken();
        return createApiClient(token).patch<T>(path, body, schema);
      },
      delete: async <T>(path: string, schema?: ZodType<T>) => {
        const token = await getAuthToken();
        return createApiClient(token).delete<T>(path, schema);
      },
    };
  }, [getToken, router]);
}
