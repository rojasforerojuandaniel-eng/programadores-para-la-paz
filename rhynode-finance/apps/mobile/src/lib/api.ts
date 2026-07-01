import NetInfo from '@react-native-community/netinfo';
import {
  clearMutation,
  enqueueMutation,
  getPendingMutations,
  incrementRetry,
  type PendingMutation,
} from './offline-queue';
import { queryClient } from './query-client';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://rhynode-finance.vercel.app';

export interface ApiOptions {
  token?: string | null;
}

export class OfflineError extends Error {
  readonly mutationId: string;

  constructor(
    mutationId: string,
    public readonly method: string,
    public readonly endpoint: string
  ) {
    super('No internet connection. The request was queued and will sync automatically.');
    this.name = 'OfflineError';
    this.mutationId = mutationId;
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

const MUTATION_METHODS = new Set<RequestInit['method']>(['POST', 'PATCH', 'DELETE']);

async function isNetworkAvailable(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  { token }: ApiOptions = {}
): Promise<T> {
  const method = options.method ?? 'GET';

  if (MUTATION_METHODS.has(method) && !(await isNetworkAvailable())) {
    const body = options.body ? JSON.parse(options.body as string) : undefined;

    const offlineHeaders: Record<string, string> = {};
    if (body && typeof body === 'object') {
      offlineHeaders['Content-Type'] = 'application/json';
    }

    const mutationId = await enqueueMutation(
      method as 'POST' | 'PATCH' | 'DELETE',
      path,
      body,
      offlineHeaders
    );

    if (method === 'POST' && body && typeof body === 'object') {
      return { id: mutationId, ...body } as unknown as T;
    }

    throw new OfflineError(mutationId, method, path);
  }

  if (token === null || token === undefined) {
    throw new AuthError('Authentication required');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${text || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export function createApiClient(token?: string | null) {
  return {
    get: <T>(path: string) => request<T>(path, {}, { token }),
    post: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'POST', body: JSON.stringify(body) }, { token }),
    patch: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, { token }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }, { token }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export async function syncPendingMutations(
  getToken: () => Promise<string | null>
): Promise<void> {
  if (!(await isNetworkAvailable())) return;

  let token: string | null;
  try {
    token = await getToken();
  } catch (error) {
    throw new AuthError('Failed to refresh authentication token', error);
  }

  if (!token) {
    throw new AuthError('Authentication required to sync pending changes');
  }

  const mutations = await getPendingMutations();
  let hasSuccess = false;

  for (const mutation of mutations) {
    if (mutation.retries >= 3) continue;

    const storedHeaders: Record<string, string> = mutation.headers
      ? (JSON.parse(mutation.headers) as Record<string, string>)
      : {};

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...storedHeaders,
    };

    try {
      const response = await fetch(`${API_URL}${mutation.endpoint}`, {
        method: mutation.method,
        headers,
        body: mutation.payload ?? undefined,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`API ${response.status}: ${text || response.statusText}`);
      }

      await clearMutation(mutation.id);
      hasSuccess = true;
    } catch {
      await incrementRetry(mutation.id);
    }
  }

  if (hasSuccess) {
    await queryClient.invalidateQueries({ queryKey: ['transactions', 'personal'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    await queryClient.invalidateQueries({ queryKey: ['personal'] });
    await queryClient.invalidateQueries({ queryKey: ['business'] });
  }
}
