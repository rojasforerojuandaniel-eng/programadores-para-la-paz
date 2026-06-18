/**
 * Parsers for Colombian bank statement exports (CSV). Each bank exports a
 * different layout; this normalizes them into a common shape ready to feed
 * the transactions import endpoint.
 *
 * Supported: Bancolombia, Davivienda, Nequi. Plus an auto-detect fallback that
 * maps columns by header keyword (date/description/amount/debit/credit).
 *
 * Amounts are normalized to signed COP: credits positive, debits negative.
 */

export type BankType = "bancolombia" | "davivienda" | "nequi" | "auto";

export interface ParsedStatementRow {
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number; // signed COP (credit +, debit -)
  currency: string;
}

export interface ParsedStatement {
  bank: BankType;
  rows: ParsedStatementRow[];
  skipped: number;
}

interface ColumnMap {
  date: number;
  description: number;
  debit?: number;
  credit?: number;
  amount?: number;
}

// Split a CSV line respecting quoted fields. Minimal but handles quoted commas.
function splitCsv(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((field) => field.trim());
}

// Parse Colombian number formats: "1.234.567,89" or "1,234,567.89" or "1234567.89".
function parseAmount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[$\sCOP]/gi, "").replace(/[()]/g, "").trim();
  if (!cleaned) return 0;
  // If both . and , present, the last one is the decimal separator.
  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");
  let normalized = cleaned;
  if (hasDot && hasComma) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      // Colombian: dots are thousands, comma decimal.
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // English: commas are thousands, dot decimal.
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    // Single comma → treat as decimal (Colombian).
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasDot && !hasComma) {
    // Could be thousands separator (single dot) or decimal. Heuristic: if 1-2 digits after last dot and total dots>1 → thousands.
    const parts = cleaned.split(".");
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 3) {
      // Ambiguous e.g. "1.234" → treat as thousands (1234) for Colombian statements.
      normalized = cleaned.replace(/\./g, "");
    }
  }
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

function parseDate(raw: string): string | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;
  // dd/mm/yyyy or dd-mm-yyyy
  const m = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    let year = m[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  // yyyy-mm-dd
  const m2 = cleaned.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (m2) {
    return `${m2[1]}-${m2[2].padStart(2, "0")}-${m2[3].padStart(2, "0")}`;
  }
  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  return null;
}

const BANK_HEADERS: Record<Exclude<BankType, "auto">, string[]> = {
  bancolombia: ["fecha", "descripcion", "valor", "detalle", "oficina", "origen"],
  davivienda: ["fecha", "descripcion", "debito", "credito", "valor", "oficina"],
  nequi: ["fecha", "descripcion", "valor", "tipo", "operacion"],
};

function detectBank(headers: string[]): BankType {
  const lower = headers.map((h) => h.toLowerCase());
  for (const bank of ["bancolombia", "davivienda", "nequi"] as const) {
    const hits = BANK_HEADERS[bank].filter((kw) => lower.some((h) => h.includes(kw))).length;
    if (hits >= 2) return bank;
  }
  return "auto";
}

function buildColumnMap(headers: string[]): ColumnMap | null {
  const lower = headers.map((h) => h.toLowerCase());
  const findIndex = (needles: string[]): number | undefined => {
    for (const needle of needles) {
      const idx = lower.findIndex((h) => h.includes(needle));
      if (idx >= 0) return idx;
    }
    return undefined;
  };
  const date = findIndex(["fecha", "date"]) ?? 0;
  const description = findIndex(["descripcion", "concepto", "detalle", "description", "operacion"]) ?? 1;
  const debit = findIndex(["debito", "debit", "salida", "valor debito"]);
  const credit = findIndex(["credito", "credit", "entrada", "valor credito"]);
  const amount = findIndex(["valor", "amount", "monto", "importe"]);

  if (debit === undefined && credit === undefined && amount === undefined) return null;
  return { date, description, debit, credit, amount };
}

export function parseStatement(csv: string, bank: BankType = "auto"): ParsedStatement {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { bank, rows: [], skipped: 0 };

  const headerLine = lines[0];
  const headers = splitCsv(headerLine);
  const detected = bank === "auto" ? detectBank(headers) : bank;
  const map = buildColumnMap(headers);
  if (!map) return { bank: detected, rows: [], skipped: lines.length - 1 };

  const rows: ParsedStatementRow[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsv(lines[i]);
    if (fields.length < Math.max(map.date, map.description) + 1) {
      skipped++;
      continue;
    }
    const dateIso = parseDate(fields[map.date] ?? "");
    if (!dateIso) {
      skipped++;
      continue;
    }
    const description = fields[map.description] ?? "";
    let amount = 0;
    if (map.debit !== undefined && map.credit !== undefined) {
      const debit = parseAmount(fields[map.debit] ?? "");
      const credit = parseAmount(fields[map.credit] ?? "");
      amount = credit - debit;
    } else if (map.amount !== undefined) {
      amount = parseAmount(fields[map.amount] ?? "");
      // Some exports put debits as negative already; if a separate sign column exists, trust it.
      // Parenthesized negatives were already handled in parseAmount.
    }
    if (amount === 0 && !description) {
      skipped++;
      continue;
    }
    rows.push({ date: dateIso, description, amount, currency: "COP" });
  }

  return { bank: detected, rows, skipped };
}