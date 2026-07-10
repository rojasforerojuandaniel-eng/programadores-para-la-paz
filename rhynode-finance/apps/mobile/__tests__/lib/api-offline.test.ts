jest.mock('expo/virtual/env.js', () => ({
  env: process.env,
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('~/lib/query-client', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
  createAsyncStoragePersister: jest.fn(),
}));

import { queryClient } from '~/lib/query-client';

jest.mock('~/hooks/use-toast', () => ({
  showToast: jest.fn(),
  useToast: {
    getState: jest.fn(),
  },
}));

import NetInfo from '@react-native-community/netinfo';
import * as SQLite from 'expo-sqlite';
import { z } from 'zod';
import * as apiModule from '~/lib/api';
import * as offlineQueue from '~/lib/offline-queue';
import { showToast } from '~/hooks/use-toast';
import { createMockDb, type Row } from '../mocks/sqlite';

const mockDb = createMockDb();
(SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);

describe('api offline behavior', () => {
  function setOnline(online: boolean) {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: online,
      isInternetReachable: online,
    });
  }

  beforeEach(() => {
    mockDb.reset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('POST while offline throws OfflineError with optimistic data', async () => {
    setOnline(false);

    const api = apiModule.createApiClient('token');
    const body = { amount: 100, description: 'Coffee' };

    let thrownError: apiModule.OfflineError | undefined;
    try {
      await api.post('/api/personal/transactions', body);
    } catch (error) {
      thrownError = error as apiModule.OfflineError;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError?.name).toBe('OfflineError');
    expect(thrownError?.method).toBe('POST');
    expect(thrownError?.endpoint).toBe('/api/personal/transactions');
    expect(thrownError?.optimistic).toMatchObject({
      amount: 100,
      description: 'Coffee',
    });
    expect(typeof (thrownError?.optimistic as Record<string, unknown>).id).toBe('string');
  });

  it('PATCH and DELETE while offline throw OfflineError without optimistic data', async () => {
    setOnline(false);
    const api = apiModule.createApiClient('token');

    await expect(
      api.patch('/api/personal/transactions/123', { amount: 200 })
    ).rejects.toThrow(apiModule.OfflineError);

    try {
      await api.patch('/api/personal/transactions/123', { amount: 200 });
    } catch (error) {
      const offlineError = error as apiModule.OfflineError;
      expect(offlineError.optimistic).toBeNull();
    }

    await expect(api.delete('/api/personal/transactions/123')).rejects.toThrow(
      apiModule.OfflineError
    );
  });

  it('postFormData while offline queues a lightweight representation with file URI', async () => {
    setOnline(false);

    const api = apiModule.createApiClient('token');
    const fields = [
      { name: 'file', file: { uri: 'file://tmp/receipt.jpg', name: 'receipt.jpg', type: 'image/jpeg' } },
    ];

    let thrownError: apiModule.OfflineError | undefined;
    try {
      await api.postFormData('/api/mobile/upload-receipt', fields);
    } catch (error) {
      thrownError = error as apiModule.OfflineError;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError?.name).toBe('OfflineError');

    const mutations = await offlineQueue.getPendingMutations();
    expect(mutations).toHaveLength(1);
    const payload = JSON.parse(mutations[0].payload ?? '{}');
    expect(payload.__formData).toBe(true);
    expect(payload.fields).toEqual(fields);
  });

  it('syncPendingMutations skips processing when offline', async () => {
    setOnline(false);
    const getToken = jest.fn().mockResolvedValue('token');

    await apiModule.syncPendingMutations(getToken);
    expect(getToken).not.toHaveBeenCalled();
  });

  it('syncPendingMutations sends pending mutations when online', async () => {
    setOnline(true);
    const getToken = jest.fn().mockResolvedValue('token');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });

    await offlineQueue.enqueueMutation('POST', '/api/personal/transactions', { amount: 100 });

    await apiModule.syncPendingMutations(getToken);

    expect(getToken).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('syncPendingMutations moves exhausted mutations to dead letter and notifies', async () => {
    setOnline(true);
    const getToken = jest.fn().mockResolvedValue('token');

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: jest.fn().mockResolvedValue('Server error'),
    });

    await offlineQueue.enqueueMutation('POST', '/api/personal/transactions', { amount: 100 });

    await apiModule.syncPendingMutations(getToken);
    await apiModule.syncPendingMutations(getToken);
    await apiModule.syncPendingMutations(getToken);

    const pending = await offlineQueue.getPendingMutations();
    expect(pending).toHaveLength(0);

    const allRows = await mockDb.getAllAsync<Row>('SELECT * FROM pending_mutations');
    expect(allRows).toHaveLength(1);
    expect(allRows[0].status).toBe('failed_permanently');
    expect(allRows[0].retries).toBeGreaterThanOrEqual(3);
    expect(showToast).toHaveBeenCalledWith(
      'Un cambio no pudo sincronizarse. Revisa la cola offline.',
      'error'
    );
  });

  it('syncPendingMutations marks existing exhausted mutations as dead letter', async () => {
    setOnline(true);
    const getToken = jest.fn().mockResolvedValue('token');
    global.fetch = jest.fn();

    const id = await offlineQueue.enqueueMutation('POST', '/api/personal/transactions', {
      amount: 100,
    });
    await offlineQueue.incrementRetry(id);
    await offlineQueue.incrementRetry(id);
    await offlineQueue.incrementRetry(id);

    await apiModule.syncPendingMutations(getToken);

    expect(global.fetch).not.toHaveBeenCalled();
    const pending = await offlineQueue.getPendingMutations();
    expect(pending).toHaveLength(0);
    expect(showToast).toHaveBeenCalledWith(
      'Un cambio no pudo sincronizarse. Revisa la cola offline.',
      'error'
    );
  });

  it('syncPendingMutations throws AuthError when token refresh fails', async () => {
    setOnline(true);
    const getToken = jest.fn().mockRejectedValue(new Error('refresh failed'));

    await expect(apiModule.syncPendingMutations(getToken)).rejects.toBeInstanceOf(
      apiModule.AuthError
    );
  });

  it('syncPendingMutations returns gracefully when no token is available', async () => {
    setOnline(true);
    const getToken = jest.fn().mockResolvedValue(null);

    await expect(apiModule.syncPendingMutations(getToken)).resolves.toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('syncPendingMutations propagates auth errors from the server', async () => {
    setOnline(true);
    const getToken = jest.fn().mockResolvedValue('token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('Unauthorized'),
    });

    await offlineQueue.enqueueMutation('POST', '/api/personal/transactions', { amount: 100 });

    await expect(apiModule.syncPendingMutations(getToken)).rejects.toBeInstanceOf(
      apiModule.AuthError
    );
  });

  it('syncPendingMutations sends form-data payloads with files', async () => {
    setOnline(true);
    const getToken = jest.fn().mockResolvedValue('token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });

    await offlineQueue.enqueueMutation(
      'POST',
      '/api/mobile/upload-receipt',
      {
        __formData: true,
        fields: [
          { name: 'file', file: { uri: 'file://receipt.jpg', name: 'receipt.jpg', type: 'image/jpeg' } },
        ],
      },
      { 'Content-Type': 'multipart/form-data' }
    );

    await apiModule.syncPendingMutations(getToken);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = global.fetch.mock.calls[0];
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('syncPendingMutations handles undefined payload', async () => {
    setOnline(true);
    const getToken = jest.fn().mockResolvedValue('token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });

    await offlineQueue.enqueueMutation('POST', '/api/personal/transactions', undefined);

    await apiModule.syncPendingMutations(getToken);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('syncPendingMutations invalidates queries after successful sync', async () => {
    setOnline(true);
    const getToken = jest.fn().mockResolvedValue('token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });

    await offlineQueue.enqueueMutation('POST', '/api/personal/transactions', { amount: 100 });

    await apiModule.syncPendingMutations(getToken);

    expect(queryClient.invalidateQueries).toHaveBeenCalled();
  });

  it('throws AuthError when the API client has no token', async () => {
    setOnline(true);
    const api = apiModule.createApiClient(undefined);

    await expect(api.get('/api/health')).rejects.toBeInstanceOf(apiModule.AuthError);
  });

  it('throws SchemaError when response does not match the schema', async () => {
    setOnline(true);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ unexpected: true }),
    });

    const api = apiModule.createApiClient('token');
    const schema = z.object({ required: z.string() });

    await expect(api.get('/api/health', schema)).rejects.toBeInstanceOf(apiModule.SchemaError);
  });

  it('postFormData sends a real FormData body when online', async () => {
    setOnline(true);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ ok: true }),
    });

    const api = apiModule.createApiClient('token');
    const fields = [{ name: 'file', file: { uri: 'file://receipt.jpg', name: 'receipt.jpg', type: 'image/jpeg' } }];

    const result = await api.postFormData('/api/upload', fields);

    expect(result).toEqual({ ok: true });
    const [, init] = global.fetch.mock.calls[0];
    expect(init.body).toBeInstanceOf(FormData);
  });
});
