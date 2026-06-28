import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

export interface PendingMutation {
  id: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  endpoint: string;
  payload: string | null;
  headers: string | null;
  retries: number;
  created_at: string;
}

const DB_NAME = 'offline-queue.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;

function getDatabase(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS pending_mutations (
          id TEXT PRIMARY KEY,
          method TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          payload TEXT,
          headers TEXT,
          retries INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

export async function enqueueMutation(
  method: 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  payload: unknown,
  headers: Record<string, string> = {}
): Promise<string> {
  const id = generateId();
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO pending_mutations
      (id, method, endpoint, payload, headers, retries, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      method,
      endpoint,
      payload === undefined ? null : JSON.stringify(payload),
      JSON.stringify(headers),
      0,
      new Date().toISOString(),
    ]
  );
  return id;
}

export async function dequeueMutation(id: string): Promise<PendingMutation | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PendingMutation>(
    'SELECT * FROM pending_mutations WHERE id = ?',
    [id]
  );
  if (!row) return null;
  await clearMutation(id);
  return row;
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await getDatabase();
  return db.getAllAsync<PendingMutation>(
    'SELECT * FROM pending_mutations ORDER BY created_at ASC'
  );
}

export async function incrementRetry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE pending_mutations SET retries = retries + 1 WHERE id = ?',
    [id]
  );
}

export async function clearMutation(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM pending_mutations WHERE id = ?', [id]);
}

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}
