jest.mock('~/hooks/use-api', () => ({
  useApi: jest.fn(),
}));

import React from 'react';
import renderer from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApi } from '~/hooks/use-api';
import { useBusinessData } from '~/hooks/use-business-data';

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

describe('useBusinessData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches clients data', async () => {
    const response = {
      clients: [
        {
          id: 'client-1',
          organizationId: 'org-1',
          name: 'Acme S.A.S.',
          email: 'billing@acme.co',
          taxId: '900123456',
          phone: null,
          address: null,
          city: null,
          country: null,
          status: 'active',
          scope: 'business',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
    const api = createMockApi({ get: jest.fn().mockResolvedValue(response) });
    mockedUseApi.mockReturnValue(api);

    const { result } = renderHook(() => useBusinessData('clients'));

    await waitFor(() => !result.current.isLoading && result.current.data !== undefined);

    expect(result.current.data).toEqual(response);
    expect(api.get).toHaveBeenCalledWith('/api/mobile/business-data?type=clients', expect.anything());
  });

  it('fetches invoices data', async () => {
    const response = {
      invoices: [
        {
          id: 'inv-1',
          organizationId: 'org-1',
          clientId: 'client-1',
          projectId: null,
          number: 'INV-001',
          status: 'sent',
          currency: 'COP',
          subtotal: 1000,
          taxRate: 0.19,
          taxAmount: 190,
          total: 1190,
          issueDate: new Date().toISOString(),
          dueDate: null,
          paidAt: null,
          clientName: 'Acme S.A.S.',
          notes: null,
          terms: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
    const api = createMockApi({ get: jest.fn().mockResolvedValue(response) });
    mockedUseApi.mockReturnValue(api);

    const { result } = renderHook(() => useBusinessData('invoices'));

    await waitFor(() => !result.current.isLoading && result.current.data !== undefined);

    expect(result.current.data).toEqual(response);
    expect(api.get).toHaveBeenCalledWith('/api/mobile/business-data?type=invoices', expect.anything());
  });

  it('returns error state on failure', async () => {
    const api = createMockApi({ get: jest.fn().mockRejectedValue(new Error('Network error')) });
    mockedUseApi.mockReturnValue(api);

    const { result } = renderHook(() => useBusinessData('projects'));

    await waitFor(() => result.current.isError);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
