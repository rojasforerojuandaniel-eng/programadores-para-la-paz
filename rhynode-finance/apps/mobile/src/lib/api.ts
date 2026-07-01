import NetInfo from '@react-native-community/netinfo';
import { z, type ZodType } from 'zod';
import i18n from '~/lib/i18n';
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

export interface FormDataFile {
  uri: string;
  name: string;
  type: string;
}

export interface FormDataField {
  name: string;
  value?: string;
  file?: FormDataFile;
}

interface InternalRequestInit extends RequestInit {
  formDataFields?: FormDataField[];
}

interface SerializedFormData {
  __formData: true;
  fields: FormDataField[];
}

export class OfflineError extends Error {
  readonly mutationId: string;

  constructor(
    mutationId: string,
    public readonly method: string,
    public readonly endpoint: string,
    public readonly optimistic: unknown
  ) {
    super(i18n.t('errors.offlineQueued'));
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

export { isNetworkAvailable };

export function safeJson<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new SchemaError(i18n.t('errors.schemaValidation'), result.error.issues);
  }
  return result.data;
}

function isSerializedFormData(payload: unknown): payload is SerializedFormData {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    '__formData' in payload &&
    (payload as SerializedFormData).__formData === true &&
    Array.isArray((payload as SerializedFormData).fields)
  );
}

function buildFormData(fields: FormDataField[]): FormData {
  const form = new FormData();
  for (const field of fields) {
    if (field.file) {
      form.append(
        field.name,
        { uri: field.file.uri, name: field.file.name, type: field.file.type } as unknown as Blob
      );
    } else {
      form.append(field.name, field.value ?? '');
    }
  }
  return form;
}

async function request<T>(
  path: string,
  options: InternalRequestInit = {},
  { token }: ApiOptions = {},
  schema?: ZodType<T>
): Promise<T> {
  const method = options.method ?? 'GET';

  if (MUTATION_METHODS.has(method) && !(await isNetworkAvailable())) {
    let bodyPayload: unknown = undefined;
    const offlineHeaders: Record<string, string> = {};

    if (options.formDataFields && options.formDataFields.length > 0) {
      bodyPayload = { __formData: true, fields: options.formDataFields };
    } else if (typeof options.body === 'string') {
      bodyPayload = JSON.parse(options.body);
      offlineHeaders['Content-Type'] = 'application/json';
    }

    const mutationId = await enqueueMutation(
      method as 'POST' | 'PATCH' | 'DELETE',
      path,
      bodyPayload,
      offlineHeaders
    );

    const optimistic =
      method === 'POST' && bodyPayload && typeof bodyPayload === 'object'
        ? { id: mutationId, ...bodyPayload }
        : null;

    throw new OfflineError(mutationId, method, path, optimistic);
  }

  if (token === null || token === undefined) {
    throw new AuthError(i18n.t('auth.required'));
  }

  let body: BodyInit | null | undefined = options.body;
  let contentType: string | undefined = 'application/json';

  if (options.formDataFields && options.formDataFields.length > 0) {
    body = buildFormData(options.formDataFields);
    contentType = undefined;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ApiError(text || i18n.t('errors.generic'), response.status);
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
    postFormData: <T>(path: string, fields: FormDataField[], schema?: ZodType<T>) =>
      request<T>(path, { method: 'POST', formDataFields: fields }, { token }, schema),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

const MAX_RETRIES = 3;

function parseStoredHeaders(headers: string | null): Record<string, string> {
  if (!headers) return {};
  try {
    return JSON.parse(headers) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function syncPendingMutations(
  getToken: () => Promise<string | null>
): Promise<void> {
  if (!(await isNetworkAvailable())) return;

  let token: string | null;
  try {
    token = await getToken();
  } catch (error) {
    throw new AuthError(i18n.t('auth.tokenRefreshFailed'), error);
  }

  if (!token) {
    throw new AuthError(i18n.t('auth.requiredForSync'));
  }

  const mutations = await getPendingMutations();
  let hasSuccess = false;

  for (const mutation of mutations) {
    if (mutation.retries >= MAX_RETRIES) {
      await markDeadLetter(mutation.id);
      showToast(i18n.t('errors.syncFailed'), 'error');
      continue;
    }

    const storedHeaders = parseStoredHeaders(mutation.headers);
    const payload = mutation.payload ? (JSON.parse(mutation.payload) as unknown) : undefined;
    const serializedFormData = isSerializedFormData(payload) ? payload : null;

    let body: BodyInit | undefined;
    let contentType: string | undefined = 'application/json';

    if (serializedFormData) {
      body = buildFormData(serializedFormData.fields);
      contentType = undefined;
    } else {
      body = mutation.payload ?? undefined;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...storedHeaders,
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    try {
      const response = await fetch(`${API_URL}${mutation.endpoint}`, {
        method: mutation.method,
        headers,
        body,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || i18n.t('errors.requestFailed'));
      }

      await clearMutation(mutation.id);
      hasSuccess = true;
    } catch {
      const nextRetry = mutation.retries + 1;
      await incrementRetry(mutation.id);

      if (nextRetry >= MAX_RETRIES) {
        await markDeadLetter(mutation.id);
        showToast(i18n.t('errors.syncFailed'), 'error');
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
