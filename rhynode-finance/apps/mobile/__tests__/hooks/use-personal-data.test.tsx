jest.mock('~/hooks/use-api', () => ({
  useApi: jest.fn(),
}));

import React from 'react';
import renderer from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApi } from '~/hooks/use-api';
import { usePersonalData } from '~/hooks/use-personal-data';

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

describe('usePersonalData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches accounts data', async () => {
    const response = {
      accounts: [
        {
          id: 'acc-1',
          userId: 'user-1',
          name: 'Cuenta principal',
          type: 'checking',
          balance: 1000,
          currency: 'COP',
          color: null,
          icon: null,
          isDefault: true,
          provider: null,
          externalId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
    const api = createMockApi({ get: jest.fn().mockResolvedValue(response) });
    mockedUseApi.mockReturnValue(api);

    const { result } = renderHook(() => usePersonalData('accounts'));

    await waitFor(() => !result.current.isLoading && result.current.data !== undefined);

    expect(result.current.data).toEqual(response);
    expect(api.get).toHaveBeenCalledWith('/api/mobile/personal-data?type=accounts', expect.anything());
  });

  it('fetches budgets data', async () => {
    const response = {
      budgets: [
        {
          id: 'bdg-1',
          userId: 'user-1',
          name: 'Comida',
          amount: 500,
          period: 'monthly',
          startDate: new Date().toISOString(),
          endDate: null,
          spent: 200,
          rollover: false,
          alertThreshold: null,
          currency: 'COP',
          category: null,
        },
      ],
    };
    const api = createMockApi({ get: jest.fn().mockResolvedValue(response) });
    mockedUseApi.mockReturnValue(api);

    const { result } = renderHook(() => usePersonalData('budgets'));

    await waitFor(() => !result.current.isLoading && result.current.data !== undefined);

    expect(result.current.data).toEqual(response);
    expect(api.get).toHaveBeenCalledWith('/api/mobile/personal-data?type=budgets', expect.anything());
  });

  it('returns error state on failure', async () => {
    const api = createMockApi({ get: jest.fn().mockRejectedValue(new Error('Network error')) });
    mockedUseApi.mockReturnValue(api);

    const { result } = renderHook(() => usePersonalData('goals'));

    await waitFor(() => result.current.isError);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
