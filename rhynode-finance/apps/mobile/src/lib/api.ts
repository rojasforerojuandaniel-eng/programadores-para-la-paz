export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://rhynode-finance.vercel.app';

export interface ApiOptions {
  token?: string | null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  { token }: ApiOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

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
