/**
 * Duplicate-transaction detection for imports. Two transactions are considered
 * duplicates when they share the same signed amount (within tolerance), a
 * similar normalized description, and dates within a small window.
 *
 * Used when importing bank statements / CSVs to avoid inserting the same
 * operation twice on re-imports.
 */

export interface DedupCandidate {
  amount: number;
  description: string;
  date: string; // ISO yyyy-mm-dd or full ISO
}

export interface DedupMatch {
  index: number;
  duplicateOf: number;
  reason: string;
}

const AMOUNT_TOLERANCE = 1; // COP — exact-ish for integer COP amounts
const DATE_WINDOW_DAYS = 2;

function normalizeDescription(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function descriptionsSimilar(a: string, b: string): boolean {
  const na = normalizeDescription(a);
  const nb = normalizeDescription(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // One contains the other (bank statements add prefixes like "PSE* ").
  if (na.includes(nb) || nb.includes(na)) return true;
  const tokensA = na.split(" ");
  const tokensB = new Set(nb.split(" "));
  // Token match: exact OR prefix-of (>=4 chars) to absorb bank prefixes
  // (e.g. "compr" vs "compra", "compr*exito" vs "compra exito").
  const matchCount = tokensA.filter((ta) =>
    [...tokensB].some((tb) => ta === tb || (ta.length >= 4 && (ta.startsWith(tb) || tb.startsWith(ta))))
  ).length;
  const minTokens = Math.min(tokensA.length, tokensB.size);
  return minTokens > 0 && matchCount / minTokens >= 0.7;
}

function daysApart(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return Infinity;
  return Math.abs(da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Finds duplicates within a single batch (e.g. the rows of one CSV) and against
 * a set of existing transactions. Returns indices flagged as duplicates.
 *
 * @param incoming rows being imported
 * @param existing rows already in the DB (optional)
 * @returns matches: each entry says this incoming index duplicates another
 *          incoming index (duplicateOf < incoming.length) or an existing one
 *          (duplicateOf >= incoming.length, pointing into existing).
 */
export function findDuplicates(
  incoming: DedupCandidate[],
  existing: DedupCandidate[] = []
): DedupMatch[] {
  const matches: DedupMatch[] = [];
  const all = [...incoming, ...existing];

  for (let i = 0; i < incoming.length; i++) {
    const candidate = incoming[i];
    // Only flag against earlier incoming rows (first occurrence is the original)
    // and against all existing DB rows.
    for (let j = 0; j < i; j++) {
      const other = all[j];
      if (isDuplicate(candidate, other)) {
        matches.push({
          index: i,
          duplicateOf: j,
          reason: `mismo monto ${candidate.amount}, descripción similar y fecha ±${DATE_WINDOW_DAYS}d`,
        });
        break;
      }
    }
    if (matches.some((m) => m.index === i)) continue;
    for (let j = incoming.length; j < all.length; j++) {
      const other = all[j];
      if (isDuplicate(candidate, other)) {
        matches.push({
          index: i,
          duplicateOf: j,
          reason: `mismo monto ${candidate.amount}, descripción similar y fecha ±${DATE_WINDOW_DAYS}d`,
        });
        break;
      }
    }
  }
  return matches;
}

function isDuplicate(a: DedupCandidate, b: DedupCandidate): boolean {
  if (Math.abs(a.amount - b.amount) > AMOUNT_TOLERANCE) return false;
  if (!descriptionsSimilar(a.description, b.description)) return false;
  return daysApart(a.date, b.date) <= DATE_WINDOW_DAYS;
}