jest.mock('~/hooks/use-api', () => ({
  useApi: jest.fn(),
}));

import React from 'react';
import renderer from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApi } from '~/hooks/use-api';
import { useDashboardSummary } from '~/hooks/use-dashboard';

const mockedUseApi = useApi as jest.Mock;

type ApiClient = ReturnType<typeof useApi>;

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
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

  return { result };
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

describe('useDashboardSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns loading state while fetching', () => {
    const api = createMockApi({
      get: jest.fn().mockReturnValue(new Promise(() => {})),
    });
    mockedUseApi.mockReturnValue(api);

    const { result } = renderHook(() => useDashboardSummary());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(api.get).toHaveBeenCalledWith('/api/dashboard/summary', expect.anything());
  });

  it('returns data on success', async () => {
    const summary = {
      totalBalance: 1000,
      income: 500,
      expense: 200,
      upcomingItems: [],
      healthScore: 80,
      currency: 'COP',
    };
    const api = createMockApi({ get: jest.fn().mockResolvedValue(summary) });
    mockedUseApi.mockReturnValue(api);

    const { result } = renderHook(() => useDashboardSummary());

    await waitFor(() => !result.current.isLoading && result.current.data !== undefined);

    expect(result.current.isError).toBe(false);
    expect(result.current.data).toEqual(summary);
  });

  it('returns error state on fetch failure', async () => {
    const api = createMockApi({
      get: jest.fn().mockRejectedValue(new Error('Network error')),
    });
    mockedUseApi.mockReturnValue(api);

    const { result } = renderHook(() => useDashboardSummary());

    await waitFor(() => result.current.isError);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('refetch refreshes data', async () => {
    const firstSummary = {
      totalBalance: 1000,
      income: 500,
      expense: 200,
      upcomingItems: [],
      healthScore: 80,
      currency: 'COP',
    };
    const secondSummary = {
      totalBalance: 2000,
      income: 700,
      expense: 300,
      upcomingItems: [],
      healthScore: 85,
      currency: 'COP',
    };

    let callCount = 0;
    const get = jest.fn().mockImplementation(() => {
      callCount += 1;
      return Promise.resolve(callCount === 1 ? firstSummary : secondSummary);
    });
    mockedUseApi.mockReturnValue(createMockApi({ get }));

    const { result } = renderHook(() => useDashboardSummary());

    await waitFor(() => result.current.data !== undefined);
    expect(result.current.data).toEqual(firstSummary);

    await renderer.act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => result.current.data?.totalBalance === secondSummary.totalBalance);
    expect(result.current.data).toEqual(secondSummary);
    expect(get).toHaveBeenCalledTimes(2);
  });
});
