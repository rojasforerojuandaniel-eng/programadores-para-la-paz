export type Row = Record<string, unknown>;

export function createMockDb() {
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
      tables[tableName] = tables[tableName] ?? [];
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

  async function runAsync(sql: string, params: unknown[] = []): Promise<void> {
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
      if (params.length === 0) {
        tables[tableName] = [];
      } else {
        const id = params[0];
        tables[tableName] = tables[tableName]?.filter((r) => r.id !== id) ?? [];
      }
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
