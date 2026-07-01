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

jest.mock('~/hooks/use-toast', () => ({
  showToast: jest.fn(),
  useToast: {
    getState: jest.fn(),
  },
}));

import NetInfo from '@react-native-community/netinfo';
import * as SQLite from 'expo-sqlite';
import * as apiModule from '~/lib/api';
import * as offlineQueue from '~/lib/offline-queue';
import { showToast } from '~/hooks/use-toast';

type Row = Record<string, unknown>;

function createMockDb() {
  const tables: Record<string, Row[]> = {};
  const schema: Record<string, string[]> = {};

  function parseColumns(columnsDef: string): string[] {
    return columnsDef
      .split(',')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(/\s+/)[0])
      .filter((token) => token && !token.startsWith('PRIMARY'));
  }

  async function execAsync(sql: string): Promise<void> {
    const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]+)\)/);
    if (createMatch) {
      const [, tableName, columnsDef] = createMatch;
      schema[tableName] = parseColumns(columnsDef);
      tables[tableName] = [];
    }

    const alterMatch = sql.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)\s+(.+)/);
    if (alterMatch) {
      const [, tableName, columnName] = alterMatch;
      schema[tableName] = schema[tableName] ?? [];
      if (!schema[tableName].includes(columnName)) {
        schema[tableName].push(columnName);
      }
      for (const row of tables[tableName] ?? []) {
        if (row[columnName] === undefined) {
          row[columnName] = 'pending';
        }
      }
    }
  }

  function extractColumnNames(sql: string): string[] {
    const match = sql.match(/INSERT INTO \w+\s*\(([^)]+)\)/);
    return match?.[1].split(',').map((s) => s.trim()) ?? [];
  }

  function parseSetClause(sql: string): Array<{ column: string; value: unknown }> | null {
    const setMatch = sql.match(/SET (.+) WHERE/);
    if (!setMatch) return null;
    return setMatch[1].split(',').map((part) => {
      const [column, rawValue] = part.trim().split('=').map((s) => s.trim());
      if (rawValue === 'retries + 1') return { column, value: 'increment' };
      const stringMatch = rawValue.match(/^'([^']+)'$/);
      return { column, value: stringMatch ? stringMatch[1] : rawValue };
    });
  }

  async function runAsync(sql: string, params: unknown[]): Promise<void> {
    const insertMatch = sql.match(/INSERT INTO (\w+)/);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const columns = extractColumnNames(sql);
      const row: Row = {};
      columns.forEach((column, index) => {
        row[column] = params[index];
      });
      tables[tableName] = tables[tableName] ?? [];
      tables[tableName].push(row);
      return;
    }

    const updateMatch = sql.match(/UPDATE (\w+)/);
    if (updateMatch) {
      const tableName = updateMatch[1];
      const id = params[params.length - 1];
      const row = tables[tableName]?.find((r) => r.id === id);
      if (!row) return;
      const setClause = parseSetClause(sql);
      if (!setClause) return;
      for (const { column, value } of setClause) {
        if (value === 'increment') {
          row[column] = (Number(row[column]) || 0) + 1;
        } else {
          row[column] = value;
        }
      }
      return;
    }

    const deleteMatch = sql.match(/DELETE FROM (\w+)/);
    if (deleteMatch) {
      const tableName = deleteMatch[1];
      const id = params[0];
      tables[tableName] = tables[tableName]?.filter((r) => r.id !== id) ?? [];
    }
  }

  async function getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const pragmaMatch = sql.match(/PRAGMA table_info\(([^)]+)\)/);
    if (pragmaMatch) {
      const tableName = pragmaMatch[1];
      const columns = schema[tableName] ?? [];
      return columns.map((name) => ({ name })) as T[];
    }

    const tableMatch = sql.match(/FROM (\w+)/);
    const tableName = tableMatch?.[1];
    if (!tableName) return [];
    let rows = [...(tables[tableName] ?? [])];

    const whereMatch = sql.match(/WHERE (.+)$/);
    if (whereMatch) {
      const condition = whereMatch[1];
      if (condition.includes('id =')) {
        const id = params?.[0];
        rows = rows.filter((r) => r.id === id);
      }
      if (condition.includes("status = '")) {
        const statusMatch = condition.match(/status = '([^']+)'/);
        const status = statusMatch?.[1];
        rows = rows.filter(
          (r) => r.status === status || (status === 'pending' && r.status === undefined)
        );
      }
    }

    return rows as T[];
  }

  async function getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const rows = await getAllAsync<T>(sql, params);
    return rows[0] ?? null;
  }

  function reset() {
    for (const tableName of Object.keys(tables)) {
      tables[tableName] = [];
    }
  }

  return {
    execAsync,
    runAsync,
    getAllAsync,
    getFirstAsync,
    reset,
  };
}

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
      'Algunos cambios no pudieron sincronizarse. Revisa el registro de errores.',
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
      'Algunos cambios no pudieron sincronizarse. Revisa el registro de errores.',
      'error'
    );
  });
});
