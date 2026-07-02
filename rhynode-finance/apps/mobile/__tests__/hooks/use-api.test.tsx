jest.mock('expo/virtual/env.js', () => ({
  env: process.env,
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: jest.fn(),
}));

jest.mock('~/lib/offline-queue', () => ({
  clearMutation: jest.fn(),
  enqueueMutation: jest.fn(),
  getPendingMutations: jest.fn(),
  incrementRetry: jest.fn(),
  markDeadLetter: jest.fn(),
}));

jest.mock('~/lib/query-client', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('~/hooks/use-toast', () => ({
  showToast: jest.fn(),
}));

import React from 'react';
import renderer from 'react-test-renderer';
import { useAuth } from '@clerk/clerk-expo';
import { useApi } from '~/hooks/use-api';
import { AuthError, isAuthError } from '~/lib/api';

function renderUseApi() {
  const result: { current?: ReturnType<typeof useApi> } = {};
  const Wrapper = () => {
    result.current = useApi();
    return null;
  };
  renderer.act(() => {
    renderer.create(<Wrapper />);
  });
  return result as { current: ReturnType<typeof useApi> };
}

function mockFetch(status: number, body: unknown = {}) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn(async () => JSON.stringify(body)),
    json: jest.fn(async () => body),
  });
}

describe('useApi', () => {
  const mockGetToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      getToken: mockGetToken,
    });
    mockGetToken.mockResolvedValue('valid-token');
  });

  it('returns data on a successful request', async () => {
    mockFetch(200, { ok: true });

    const { current: api } = renderUseApi();
    const response = await api.get('/api/health');

    expect(response).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/health'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer valid-token' }),
      })
    );
  });

  it('throws AuthError with shouldSignOut:true on 401', async () => {
    mockFetch(401, { error: 'Unauthorized' });

    const { current: api } = renderUseApi();

    let thrown: unknown;
    try {
      await api.get('/api/protected');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AuthError);
    expect(isAuthError(thrown) && thrown.shouldSignOut).toBe(true);
  });

  it('throws AuthError with shouldSignOut:true on 403', async () => {
    mockFetch(403, { error: 'Forbidden' });

    const { current: api } = renderUseApi();

    let thrown: unknown;
    try {
      await api.post('/api/protected', {});
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AuthError);
    expect(isAuthError(thrown) && thrown.shouldSignOut).toBe(true);
  });

  it('throws a non-auth ApiError on other HTTP errors', async () => {
    mockFetch(500, { error: 'Server error' });

    const { current: api } = renderUseApi();

    await expect(api.get('/api/protected')).rejects.toThrow('Server error');
  });

  it('redirects when getToken returns null', async () => {
    mockGetToken.mockResolvedValue(null);
    mockFetch(200, {});

    const { current: api } = renderUseApi();

    await expect(api.get('/api/protected')).rejects.toBeInstanceOf(AuthError);
  });
});
