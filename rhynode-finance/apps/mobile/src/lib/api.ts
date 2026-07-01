import NetInfo from '@react-native-community/netinfo';
import { z, type ZodType } from 'zod';
import {
  clearMutation,
  enqueueMutation,
  getPendingMutations,
  incrementRetry,
  markDeadLetter,
  type PendingMutation,
} from './offline-queue';
import { queryClient } from './query-client';
import { showToast } from '~/hooks/use-toast';

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
    public readonly endpoint: string,
    public readonly optimistic: unknown
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

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class SchemaError extends Error {
  constructor(
    message: string,
    public readonly issues: z.core.$ZodIssue[]
  ) {
    super(message);
    this.name = 'SchemaError';
  }
}

const MUTATION_METHODS = new Set<RequestInit['method']>(['POST', 'PATCH', 'DELETE']);

async function isNetworkAvailable(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function safeJson<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new SchemaError('Response validation failed', result.error.issues);
  }
  return result.data;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  { token }: ApiOptions = {},
  schema?: ZodType<T>
): Promise<T> {
  const method = options.method ?? 'GET';

  if (MUTATION_METHODS.has(method) && !(await isNetworkAvailable())) {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : undefined;

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

    const optimistic =
      method === 'POST' && body && typeof body === 'object'
        ? { id: mutationId, ...body }
        : null;

    throw new OfflineError(mutationId, method, path, optimistic);
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
    throw new ApiError(`API ${response.status}: ${text || response.statusText}`, response.status);
  }

  const json = (await response.json()) as unknown;
  return schema ? safeJson(schema, json) : (json as T);
}

export function createApiClient(token?: string | null) {
  return {
    get: <T>(path: string, schema?: ZodType<T>) =>
      request<T>(path, {}, { token }, schema),
    post: <T>(path: string, body: unknown, schema?: ZodType<T>) =>
      request<T>(path, { method: 'POST', body: JSON.stringify(body) }, { token }, schema),
    patch: <T>(path: string, body: unknown, schema?: ZodType<T>) =>
      request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, { token }, schema),
    delete: <T>(path: string, schema?: ZodType<T>) =>
      request<T>(path, { method: 'DELETE' }, { token }, schema),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

const MAX_RETRIES = 3;
const DEAD_LETTER_MESSAGE =
  'Algunos cambios no pudieron sincronizarse. Revisa el registro de errores.';

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
    if (mutation.retries >= MAX_RETRIES) {
      await markDeadLetter(mutation.id);
      showToast(DEAD_LETTER_MESSAGE, 'error');
      continue;
    }

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
      const nextRetry = mutation.retries + 1;
      await incrementRetry(mutation.id);

      if (nextRetry >= MAX_RETRIES) {
        await markDeadLetter(mutation.id);
        showToast(DEAD_LETTER_MESSAGE, 'error');
      }
    }
  }

  if (hasSuccess) {
    await queryClient.invalidateQueries({ queryKey: ['transactions', 'personal'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    await queryClient.invalidateQueries({ queryKey: ['personal'] });
    await queryClient.invalidateQueries({ queryKey: ['business'] });
  }
}
