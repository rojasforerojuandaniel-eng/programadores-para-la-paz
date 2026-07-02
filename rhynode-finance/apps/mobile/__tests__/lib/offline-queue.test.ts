jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

import * as SQLite from 'expo-sqlite';
import * as offlineQueue from '~/lib/offline-queue';
import { createMockDb, type Row } from '../mocks/sqlite';

const mockDb = createMockDb();
(SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);

describe('offline-queue', () => {
  beforeEach(() => {
    mockDb.reset();
    jest.clearAllMocks();
  });

  it('enqueueMutation stores a pending mutation', async () => {
    const id = await offlineQueue.enqueueMutation('POST', '/api/test', { amount: 100 });
    expect(typeof id).toBe('string');

    const pending = await offlineQueue.getPendingMutations();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      method: 'POST',
      endpoint: '/api/test',
      retries: 0,
      status: 'pending',
    });
    expect(JSON.parse(pending[0].payload ?? '{}')).toEqual({ amount: 100 });
  });

  it('getPendingMutations only returns pending mutations', async () => {
    const id = await offlineQueue.enqueueMutation('PATCH', '/api/test', { amount: 200 });
    await offlineQueue.markDeadLetter(id);

    const pending = await offlineQueue.getPendingMutations();
    expect(pending).toHaveLength(0);
  });

  it('incrementRetry increases the retry count', async () => {
    const id = await offlineQueue.enqueueMutation('POST', '/api/test', { amount: 100 });
    await offlineQueue.incrementRetry(id);
    await offlineQueue.incrementRetry(id);

    const pending = await offlineQueue.getPendingMutations();
    expect(pending[0].retries).toBe(2);
  });

  it('markDeadLetter changes status to failed_permanently', async () => {
    const id = await offlineQueue.enqueueMutation('DELETE', '/api/test', null);
    await offlineQueue.markDeadLetter(id);

    const pending = await offlineQueue.getPendingMutations();
    expect(pending).toHaveLength(0);

    const all = await mockDb.getAllAsync<Row>('SELECT * FROM pending_mutations');
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe('failed_permanently');
  });

  it('clearMutation removes the mutation', async () => {
    const id = await offlineQueue.enqueueMutation('POST', '/api/test', { amount: 100 });
    await offlineQueue.clearMutation(id);

    const pending = await offlineQueue.getPendingMutations();
    expect(pending).toHaveLength(0);
  });

  it('dequeueMutation returns the mutation and removes it', async () => {
    const id = await offlineQueue.enqueueMutation('POST', '/api/test', { amount: 100 });
    const mutation = await offlineQueue.dequeueMutation(id);

    expect(mutation?.id).toBe(id);
    const pending = await offlineQueue.getPendingMutations();
    expect(pending).toHaveLength(0);
  });

  it('dequeueMutation returns null for unknown id', async () => {
    const mutation = await offlineQueue.dequeueMutation('unknown-id');
    expect(mutation).toBeNull();
  });

  it('stores null payload when undefined is passed', async () => {
    const id = await offlineQueue.enqueueMutation('POST', '/api/test', undefined);

    const all = await mockDb.getAllAsync<Row>('SELECT * FROM pending_mutations WHERE id = ?', [id]);
    expect(all[0].payload).toBeNull();
  });

  it('getFailedMutations only returns failed_permanently mutations', async () => {
    const id = await offlineQueue.enqueueMutation('POST', '/api/test', { amount: 100 });
    await offlineQueue.markDeadLetter(id);

    const failed = await offlineQueue.getFailedMutations();
    expect(failed).toHaveLength(1);
    expect(failed[0].status).toBe('failed_permanently');
  });

  it('retryMutation resets status and retries', async () => {
    const id = await offlineQueue.enqueueMutation('POST', '/api/test', { amount: 100 });
    await offlineQueue.markDeadLetter(id);
    await offlineQueue.retryMutation(id);

    const pending = await offlineQueue.getPendingMutations();
    expect(pending).toHaveLength(1);
    expect(Number(pending[0].retries)).toBe(0);
    expect(pending[0].status).toBe('pending');
  });

  it('resetOfflineQueue removes all mutations', async () => {
    await offlineQueue.enqueueMutation('POST', '/api/test', { amount: 100 });
    await offlineQueue.enqueueMutation('PATCH', '/api/test', { amount: 200 });
    await offlineQueue.markDeadLetter(await offlineQueue.enqueueMutation('DELETE', '/api/test', null));

    await offlineQueue.resetOfflineQueue();

    expect(await offlineQueue.getPendingMutations()).toHaveLength(0);
    expect(await offlineQueue.getFailedMutations()).toHaveLength(0);
  });
});
