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
import { useTransactions, useCreateTransaction } from '~/hooks/use-transactions';

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

  return result;
}

function renderHooks() {
  return {
    list: renderHook(() => useTransactions()),
    create: renderHook(() => useCreateTransaction()),
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

describe('useTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists transactions on success', async () => {
    const transactions = [
      {
        id: 'txn-1',
        type: 'EXPENSE',
        category: 'Food',
        description: 'Lunch',
        amount: 20,
        currency: 'COP',
        date: new Date().toISOString(),
      },
    ];
    const api = createMockApi({
      get: jest.fn().mockResolvedValue({ transactions, nextCursor: null }),
    });
    mockedUseApi.mockReturnValue(api);

    const { list } = renderHooks();

    await waitFor(() => !list.current.isLoading && list.current.transactions.length > 0);

    expect(list.current.isError).toBe(false);
    expect(list.current.transactions).toHaveLength(1);
    expect(list.current.transactions[0].description).toBe('Lunch');
    expect(api.get).toHaveBeenCalledWith('/api/personal/transactions', expect.anything());
  });

  it('accumulates pages and exposes hasMore', async () => {
    const pageOne = [
      { id: 'txn-1', type: 'EXPENSE', category: 'Food', description: 'Lunch', amount: 20, currency: 'COP', date: new Date().toISOString() },
    ];
    const pageTwo = [
      { id: 'txn-2', type: 'INCOME', category: 'Salary', description: 'Pay', amount: 1000, currency: 'COP', date: new Date().toISOString() },
    ];
    const get = jest.fn().mockResolvedValueOnce({ transactions: pageOne, nextCursor: 'cursor-1' }).mockResolvedValueOnce({ transactions: pageTwo, nextCursor: null });
    const api = createMockApi({ get });
    mockedUseApi.mockReturnValue(api);

    const { list } = renderHooks();

    await waitFor(() => list.current.transactions.length === 1 && !list.current.isLoading);
    expect(list.current.hasMore).toBe(true);

    await renderer.act(async () => {
      list.current.loadMore();
      await Promise.resolve();
    });

    await waitFor(() => list.current.transactions.length === 2);
    expect(list.current.hasMore).toBe(false);
    expect(list.current.transactions[1].description).toBe('Pay');
    expect(get).toHaveBeenLastCalledWith('/api/personal/transactions?cursor=cursor-1', expect.anything());
  });

  it('returns error when listing fails', async () => {
    const api = createMockApi({
      get: jest.fn().mockRejectedValue(new Error('Server error')),
    });
    mockedUseApi.mockReturnValue(api);

    const { list } = renderHooks();

    await waitFor(() => list.current.isError);

    expect(list.current.isLoading).toBe(false);
  });

  it('creates a transaction', async () => {
    const created = {
      id: 'txn-new',
      type: 'INCOME',
      category: 'Income',
      description: 'Salary',
      amount: 1000,
      currency: 'COP',
      date: new Date().toISOString(),
    };
    const post = jest.fn().mockResolvedValue({ transaction: created });
    mockedUseApi.mockReturnValue(createMockApi({ post }));

    const { create } = renderHooks();

    await renderer.act(async () => {
      create.current.mutate({
        type: 'INCOME',
        description: 'Salary',
        amount: 1000,
        currency: 'COP',
        date: new Date().toISOString(),
      });
    });

    await waitFor(() => create.current.isSuccess);

    expect(create.current.data?.transaction).toEqual(created);
    expect(post).toHaveBeenCalledWith(
      '/api/personal/transactions',
      expect.objectContaining({ type: 'INCOME', description: 'Salary', amount: 1000 }),
      expect.anything()
    );
  });
});
