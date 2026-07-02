jest.mock('~/hooks/use-api', () => ({
  useApi: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

import React from 'react';
import renderer from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApi } from '~/hooks/use-api';
import {
  useTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from '~/hooks/use-transaction';

const mockedUseApi = useApi as jest.Mock;

type ApiClient = ReturnType<typeof useApi>;

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderHook<T>(useHook: () => T) {
  const queryClient = createTestQueryClient();
  const result = { current: undefined as unknown as T };

  function Wrapper() {
    result.current = useHook();
    return null;
  }

  renderer.act(() => {
    renderer.create(
      <QueryClientProvider client={queryClient}>
        <Wrapper />
      </QueryClientProvider>
    );
  });

  return {
    get current() {
      return result.current as T;
    },
  };
}

async function waitFor(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 10000, interval = 20 } = options;
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
    await renderer.act(async () => {
      await Promise.resolve();
    });
  }
}

function createMockApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    postFormData: jest.fn(),
    ...overrides,
  } as unknown as ApiClient;
}

describe('useTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches transaction detail when id is provided', async () => {
    const transaction = {
      id: 'txn-1',
      type: 'EXPENSE',
      category: 'Food',
      description: 'Lunch',
      amount: 20,
      currency: 'COP',
      date: new Date().toISOString(),
      accountName: null,
      bankAccountName: null,
      organizationName: 'Personal',
    };
    const api = createMockApi({
      get: jest.fn().mockResolvedValue({ transaction }),
    });
    mockedUseApi.mockReturnValue(api);

    const hook = renderHook(() => useTransaction('txn-1'));

    await waitFor(() => !hook.current.isLoading && hook.current.data !== undefined);

    expect(hook.current.data).toEqual(transaction);
    expect(api.get).toHaveBeenCalledWith(
      '/api/personal/transactions/txn-1',
      expect.anything()
    );
  });

  it('remains idle when id is undefined', () => {
    const api = createMockApi();
    mockedUseApi.mockReturnValue(api);

    const hook = renderHook(() => useTransaction(undefined));

    expect(hook.current.isLoading).toBe(false);
    expect(hook.current.isFetching).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });
});

describe('useDeleteTransaction', () => {
  it('deletes a transaction and invalidates queries', async () => {
    const apiDelete = jest.fn().mockResolvedValue({ success: true });
    mockedUseApi.mockReturnValue(createMockApi({ delete: apiDelete }));

    const hook = renderHook(() => useDeleteTransaction());

    await renderer.act(async () => {
      hook.current.mutate('txn-1');
    });

    await waitFor(() => hook.current.isSuccess);

    expect(apiDelete).toHaveBeenCalledWith(
      '/api/personal/transactions/txn-1',
      expect.anything()
    );
    expect(hook.current.data).toEqual({ success: true });
  });
});

describe('useUpdateTransaction', () => {
  it('updates a transaction and sets query data', async () => {
    const updated = {
      id: 'txn-1',
      type: 'EXPENSE',
      category: 'Food',
      description: 'Updated lunch',
      amount: 25,
      currency: 'COP',
      date: new Date().toISOString(),
      accountName: null,
      bankAccountName: null,
      organizationName: 'Personal',
    };
    const apiPatch = jest.fn().mockResolvedValue({ transaction: updated });
    mockedUseApi.mockReturnValue(createMockApi({ patch: apiPatch }));

    const hook = renderHook(() => useUpdateTransaction());

    await renderer.act(async () => {
      hook.current.mutate({ transactionId: 'txn-1', body: { amount: 25 } });
    });

    await waitFor(() => hook.current.isSuccess);

    expect(apiPatch).toHaveBeenCalledWith(
      '/api/personal/transactions/txn-1',
      { amount: 25 },
      expect.anything()
    );
    expect(hook.current.data).toEqual({ transaction: updated });
  });
});
