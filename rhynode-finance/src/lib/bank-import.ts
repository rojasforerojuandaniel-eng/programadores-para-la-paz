import * as XLSX from "xlsx";
import { randomUUID } from "node:crypto";
import { logger } from "@/lib/logger";

export type BankTransactionType = "INCOME" | "EXPENSE";

export interface ParsedBankRow {
  id: string;
  rowIndex: number;
  rawDate: string;
  date: Date;
  description: string;
  amount: number;
  type: BankTransactionType;
  raw: Record<string, unknown>;
  duplicate: boolean;
  duplicateOf?: string;
}

export interface ColumnMapping {
  date?: string;
  description?: string;
  debit?: string;
  credit?: string;
  amount?: string;
  balance?: string;
}

export interface ParseResult {
  rows: ParsedBankRow[];
  headers: string[];
  mapping: ColumnMapping;
  totalRows: number;
  parsedRows: number;
  duplicateCount: number;
}

export interface ExistingTransaction {
  id: string;
  date: Date;
  amount: number;
  description: string;
}

const COLUMN_KEYWORDS: Record<keyof ColumnMapping, string[]> = {
  date: ["fecha", "date", "f.", "dia", "día", "fecha transaccion", "fecha trx"],
  description: [
    "descripcion",
    "descripción",
    "description",
    "concepto",
    "detalle",
    "referencia",
    "transaccion",
    "transacción",
    "movimiento",
    "comprobante",
    "compra",
    "establecimiento",
    "oficina",
    "observacion",
    "observación",
    "detalles",
  ],
  debit: [
    "debito",
    "débito",
    "debit",
    "cargo",
    "retiro",
    "salida",
    "egreso",
    "débitos",
    "debitos",
    "cargos",
    "retiros",
  ],
  credit: [
    "credito",
    "crédito",
    "credit",
    "abono",
    "deposito",
    "depósito",
    "entrada",
    "ingreso",
    "créditos",
    "creditos",
    "abonos",
    "depositos",
    "depósitos",
  ],
  amount: ["monto", "amount", "valor", "importe", "total", "cantidad", "suma", "vr"],
  balance: ["saldo", "balance", "saldo disponible", "saldo contable"],
};

function normalizeHeader(header: unknown): string {
  if (header === null || header === undefined) return "";
  return String(header)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
function headerScore(header: string, keywords: string[]): number {
  const normalized = normalizeHeader(header);
  if (!normalized) return 0;

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeHeader(keyword);
    if (normalized === normalizedKeyword) return 100;
    if (normalized.includes(normalizedKeyword)) return 50 + normalizedKeyword.length;
  }

  const words = normalized.split(" ");
  for (const word of words) {
    for (const keyword of keywords) {
      const k = normalizeHeader(keyword);
      if (k.length > 3 && word.includes(k)) return 20;
      if (word.length > 3 && k.includes(word)) return 15;
    }
  }

  return 0;
}

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const assigned = new Set<string>();
  const keys = ["date", "description", "debit", "credit", "amount", "balance"] as const;

  for (const key of keys) {
    let bestHeader: string | undefined;
    let bestScore = 0;

    for (const header of headers) {
      if (assigned.has(header)) continue;
      const score = headerScore(header, COLUMN_KEYWORDS[key]);
      if (score > bestScore) {
        bestScore = score;
        bestHeader = header;
      }
    }

    if (bestHeader && bestScore >= 15) {
      mapping[key] = bestHeader;
      assigned.add(bestHeader);
    }
  }

  return mapping;
}

function stripNonNumeric(value: string): string {
  return value.replace(/[^0-9.,\-]/g, "").trim();
}

export function normalizeAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  let raw = String(value).trim();
  if (!raw) return null;

  raw = raw
    .replace(/[()]/g, "")
    .replace(/\$/g, "")
    .replace(/COP|USD|MXN|BRL|\s+/g, "")
    .trim();

  const numeric = stripNonNumeric(raw);
  if (!numeric) return null;

  const isNegative = numeric.startsWith("-");
  const digitsAndSeparators = numeric.replace(/^-/, "");

  const dotIndex = digitsAndSeparators.lastIndexOf(".");
  const commaIndex = digitsAndSeparators.lastIndexOf(",");

  let decimalSeparator: "." | "," | null = null;
  let clean = digitsAndSeparators;

  if (dotIndex !== -1 && commaIndex !== -1) {
    decimalSeparator = dotIndex > commaIndex ? "." : ",";
  } else if (dotIndex !== -1) {
    const lastGroupLength = digitsAndSeparators.length - dotIndex - 1;
    if (lastGroupLength <= 2) {
      decimalSeparator = ".";
    }
  } else if (commaIndex !== -1) {
    const lastGroupLength = digitsAndSeparators.length - commaIndex - 1;
    if (lastGroupLength <= 2) {
      decimalSeparator = ",";
    }
  }

  if (decimalSeparator === ".") {
    clean = clean.replace(/,/g, "");
  } else if (decimalSeparator === ",") {
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else {
    clean = clean.replace(/[.,]/g, "");
  }

  const amount = Number(clean);
  if (Number.isNaN(amount) || !Number.isFinite(amount)) return null;

  return isNegative ? -amount : amount;
}

function parseDateWithFormat(value: string): Date | null {
  value = value.trim();
  if (!value) return null;

  const isoMatch = value.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  const dmyMatch = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]) - 1;
    const year = Number(dmyMatch[3]);
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  const mdyMatch = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (mdyMatch) {
    const month = Number(mdyMatch[1]) - 1;
    const day = Number(mdyMatch[2]);
    const year = Number(mdyMatch[3]);
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  const shortYearMatch = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2})$/);
  if (shortYearMatch) {
    const day = Number(shortYearMatch[1]);
    const month = Number(shortYearMatch[2]) - 1;
    let year = Number(shortYearMatch[3]);
    year += year >= 50 ? 1900 : 2000;
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  if (/^\d+(\.\d+)?$/.test(value)) {
    const serial = Number(value);
    if (serial > 30000 && serial < 50000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const msPerDay = 24 * 60 * 60 * 1000;
      const date = new Date(epoch.getTime() + Math.round(serial * msPerDay));
      if (!Number.isNaN(date.getTime())) {
        return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      }
    }
  }

  return null;
}

export function normalizeDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    if (value > 30000 && value < 50000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const msPerDay = 24 * 60 * 60 * 1000;
      const serialDate = new Date(epoch.getTime() + Math.round(value * msPerDay));
      return new Date(serialDate.getUTCFullYear(), serialDate.getUTCMonth(), serialDate.getUTCDate());
    }
    return null;
  }

  return parseDateWithFormat(String(value));
}

function inferType(
  record: Record<string, unknown>,
  mapping: ColumnMapping,
  amount: number
): BankTransactionType {
  if (mapping.debit && mapping.credit) {
    const debit = normalizeAmount(record[mapping.debit]);
    const credit = normalizeAmount(record[mapping.credit]);
    if (debit !== null && credit === null && debit > 0) return "EXPENSE";
    if (credit !== null && debit === null && credit > 0) return "INCOME";
    if (debit !== null && credit !== null) {
      return debit > 0 ? "EXPENSE" : credit > 0 ? "INCOME" : amount >= 0 ? "INCOME" : "EXPENSE";
    }
  }

  if (mapping.debit) {
    const debit = normalizeAmount(record[mapping.debit]);
    if (debit !== null && debit > 0) return "EXPENSE";
  }

  if (mapping.credit) {
    const credit = normalizeAmount(record[mapping.credit]);
    if (credit !== null && credit > 0) return "INCOME";
  }

  return amount < 0 ? "EXPENSE" : "INCOME";
}

function buildRecord(headers: string[], row: unknown[]): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (!header) continue;
    record[header] = row[i];
  }
  return record;
}

export function parseBankFile(buffer: Buffer, filename: string): unknown[][] {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("El archivo no contiene hojas de cálculo");
    }
    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) {
      throw new Error("No se pudo leer la primera hoja del archivo");
    }
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    return rows;
  } catch (error) {
    logger.error("Failed to parse bank file", {
      filename,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error("No se pudo leer el archivo. Verifica que sea CSV o Excel válido.");
  }
}

export function parseRows(matrix: unknown[][]): ParseResult {
  if (matrix.length === 0) {
    return { rows: [], headers: [], mapping: {}, totalRows: 0, parsedRows: 0, duplicateCount: 0 };
  }

  let headerIndex = 0;
  let bestHeaderScore = 0;

  for (let i = 0; i < Math.min(matrix.length, 15); i++) {
    const row = matrix[i] ?? [];
    const nonEmpty = row.filter((cell) => cell !== "" && cell !== null && cell !== undefined).length;
    if (nonEmpty < 2) continue;

    const headers = row.map(String);
    const mapping = detectColumnMapping(headers);
    const score = Object.values(mapping).filter(Boolean).length;
    if (score > bestHeaderScore) {
      bestHeaderScore = score;
      headerIndex = i;
    }
  }

  const headers = matrix[headerIndex]?.map((h) => String(h ?? "").trim()) ?? [];
  const mapping = detectColumnMapping(headers);
  const dataRows = matrix.slice(headerIndex + 1);

  const rows: ParsedBankRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rawRow = dataRows[i] ?? [];
    const hasData = rawRow.some((cell) => cell !== "" && cell !== null && cell !== undefined);
    if (!hasData) continue;

    const record = buildRecord(headers, rawRow);

    const rawDate = mapping.date ? record[mapping.date] : null;
    const date = normalizeDate(rawDate);
    if (!date) continue;

    let description = "";
    if (mapping.description) {
      description = String(record[mapping.description] ?? "").trim();
    }
    if (!description) {
      const fallbackParts: string[] = [];
      for (const [key, value] of Object.entries(record)) {
        if (mapping.amount && key === mapping.amount) continue;
        if (mapping.balance && key === mapping.balance) continue;
        if (value !== null && value !== undefined && String(value).trim()) {
          fallbackParts.push(String(value).trim());
        }
      }
      description = fallbackParts.join(" ").trim();
    }
    if (!description) continue;

    let amount: number | null = null;
    if (mapping.amount) {
      amount = normalizeAmount(record[mapping.amount]);
    } else if (mapping.debit || mapping.credit) {
      const debit = mapping.debit ? normalizeAmount(record[mapping.debit]) : null;
      const credit = mapping.credit ? normalizeAmount(record[mapping.credit]) : null;
      if (debit !== null && debit > 0) amount = debit;
      else if (credit !== null && credit > 0) amount = credit;
    }

    if (amount === null || amount === 0) continue;

    const type = inferType(record, mapping, amount);
    const absoluteAmount = Math.abs(amount);

    rows.push({
      id: randomUUID(),
      rowIndex: i,
      rawDate: rawDate !== null && rawDate !== undefined ? String(rawDate) : "",
      date,
      description,
      amount: absoluteAmount,
      type,
      raw: record,
      duplicate: false,
    });
  }

  return {
    rows,
    headers,
    mapping,
    totalRows: dataRows.length,
    parsedRows: rows.length,
    duplicateCount: 0,
  };
}

function normalizeDescription(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function detectDuplicates(
  rows: ParsedBankRow[],
  existing: ExistingTransaction[]
): ParsedBankRow[] {
  const existingKeys = new Map<string, string>();
  for (const tx of existing) {
    const key = `${tx.date.toISOString().split("T")[0]}|${Math.abs(tx.amount).toFixed(2)}|${normalizeDescription(tx.description)}`;
    existingKeys.set(key, tx.id);
  }

  return rows.map((row) => {
    const key = `${row.date.toISOString().split("T")[0]}|${row.amount.toFixed(2)}|${normalizeDescription(row.description)}`;
    const duplicateOf = existingKeys.get(key);
    if (duplicateOf) {
      return { ...row, duplicate: true, duplicateOf };
    }
    return row;
  });
}

export function validateFileType(filename: string, mimeType?: string): boolean {
  const lowerName = filename.toLowerCase();
  const allowedExtensions = [".csv", ".xlsx", ".xls", ".ods"];
  const validExtension = allowedExtensions.some((ext) => lowerName.endsWith(ext));
  if (validExtension) return true;

  if (!mimeType) return false;
  const allowedMimes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.oasis.opendocument.spreadsheet",
    "text/plain",
  ];
  return allowedMimes.includes(mimeType);
}
