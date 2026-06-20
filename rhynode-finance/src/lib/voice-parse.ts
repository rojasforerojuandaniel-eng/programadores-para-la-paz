/**
 * On-device parser for spoken transactions in Spanish (es-CO). No network —
 * the Web Speech API transcript is parsed locally so the audio/text never
 * leaves the browser (better for financial data) and it's instant + free.
 *
 * Handles patterns like:
 *   "me gasté 20.000 en hamburguesas"   → EXPENSE, 20000, "hamburguesas"
 *   "recibí veinte mil del sueldo"      → INCOME,  20000, "sueldo"
 *   "pagué ciento cincuenta mil de arriendo" → EXPENSE, 150000, "arriendo"
 *   "me llegó 500.000 por una venta"    → INCOME,  500000, "venta"
 */

export type ParsedType = "INCOME" | "EXPENSE" | null;

export interface ParsedTransaction {
  type: ParsedType;
  amount: number | null;
  description: string;
}

const EXPENSE_KEYWORDS = [
  "gasté", "gaste", "gastó", "gasto", "gastamos",
  "pagué", "pague", "pagó", "pago", "pagamos",
  "compré", "compre", "compró", "compra", "compramos",
  "salí", "sali", "cuesta", "costó", "costo", "pague",
];

const INCOME_KEYWORDS = [
  "recibí", "recibi", "recibió", "recibio",
  "gané", "gane", "ganó", "gano",
  "cobré", "cobre", "cobré", "cobro",
  "ingresé", "ingrese", "ingresó", "ingreso",
  "me llegó", "me llego", "llego", "llegó", "me pagaron", "depositaron",
  "vendí", "vendi", "vendió", "vendio", "venta",
  "sueldo", "salario", "abonaron", "transferí", "transferi",
];

const UNITS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, unos: 1, dos: 2, tres: 3, cuatro: 4,
  cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
};
const TEENS: Record<string, number> = {
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
};
const TENS: Record<string, number> = {
  veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70,
  ochenta: 80, noventa: 90,
};
const HUNDREDS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500,
  seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700,
  ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i")
    .replace(/ó/g, "o").replace(/ú/g, "u").replace(/ñ/g, "n")
    .replace(/à/g, "a").replace(/è/g, "e").replace(/ì/g, "i").replace(/ò/g, "o").replace(/ù/g, "u")
    .replace(/[¿?¡!;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse a Spanish number from digit form (es-CO: . thousands, , decimal). */
function parseDigitAmount(token: string): number | null {
  // "20.000" -> 20000 ; "20,5" -> 20.5 ; "20000" -> 20000
  if (!/^\d[\d.,]*$/.test(token)) return null;
  if (token.includes(",")) {
    const [intPart, decPart] = token.split(",");
    return Number(intPart.replace(/\./g, "") + "." + (decPart ?? ""));
  }
  return Number(token.replace(/\./g, ""));
}

/** Parse a run of Spanish number words into a value. */
function parseWordAmount(tokens: string[]): number | null {
  let total = 0;
  let section = 0;
  let foundAny = false;
  for (const raw of tokens) {
    const t = raw.trim();
    if (!t) continue;
    if (t === "y") continue;
    if (UNITS[t] !== undefined) { section += UNITS[t]; foundAny = true; }
    else if (TEENS[t] !== undefined) { section += TEENS[t]; foundAny = true; }
    else if (TENS[t] !== undefined) { section += TENS[t]; foundAny = true; }
    else if (HUNDREDS[t] !== undefined) { section += HUNDREDS[t]; foundAny = true; }
    else if (t === "mil") {
      section = section === 0 ? 1 : section;
      total += section * 1000;
      section = 0;
      foundAny = true;
    } else if (t === "millon" || t === "millones") {
      section = section === 0 ? 1 : section;
      total += section * 1000000;
      section = 0;
      foundAny = true;
    } else {
      // non-number word ends the run
      break;
    }
  }
  if (!foundAny) return null;
  return total + section;
}

function detectType(text: string): ParsedType {
  for (const kw of EXPENSE_KEYWORDS) if (text.includes(kw)) return "EXPENSE";
  for (const kw of INCOME_KEYWORDS) if (text.includes(kw)) return "INCOME";
  return null;
}

function findAmount(text: string): { amount: number | null; rest: string } {
  const words = text.split(" ").filter(Boolean);

  // 1) Digit form anywhere.
  for (let i = 0; i < words.length; i++) {
    const amt = parseDigitAmount(words[i]);
    if (amt !== null) {
      const rest = words.slice(0, i).concat(words.slice(i + 1)).join(" ");
      return { amount: amt, rest };
    }
  }

  // 2) Word form: scan for the longest run starting at each position.
  let best: { amount: number; start: number; end: number } | null = null;
  for (let i = 0; i < words.length; i++) {
    const run: string[] = [];
    for (let j = i; j < words.length; j++) {
      const t = words[j];
      if (
        UNITS[t] !== undefined || TEENS[t] !== undefined ||
        TENS[t] !== undefined || HUNDREDS[t] !== undefined ||
        t === "mil" || t === "millon" || t === "millones" || t === "y"
      ) {
        run.push(t);
      } else break;
    }
    if (run.length) {
      const amt = parseWordAmount(run);
      if (amt !== null && amt > 0) {
        if (!best || run.length > best.end - best.start) {
          best = { amount: amt, start: i, end: i + run.length };
        }
      }
    }
  }
  if (best) {
    const rest = words.slice(0, best.start).concat(words.slice(best.end)).join(" ");
    return { amount: best.amount, rest };
  }
  return { amount: null, rest: text };
}

function stripFillers(d: string): string {
  const fillers = /^(en|de|del|para|por|una|un|el|la|los|las|unos|unas|mi)\s+/i;
  let prev: string;
  let out = d.trim();
  do {
    prev = out;
    out = out.replace(fillers, "").trim();
  } while (out !== prev);
  return out;
}

function extractDescription(rest: string): string {
  let d = rest.trim();
  // Drop a leading subject pronoun ("me", "yo", "nos") before the verb.
  d = d.replace(/^(me|yo|nos|se)\s+/i, "").trim();
  // Strip any type keyword at the start ("gasté", "recibí", ...).
  for (const kw of [...EXPENSE_KEYWORDS, ...INCOME_KEYWORDS]) {
    if (d.startsWith(kw + " ")) {
      d = d.slice(kw.length + 1);
      break;
    }
  }
  // Drop leading filler words ("en", "de", "por", "una", ...) repeatedly.
  return stripFillers(d);
}

export function parseTransaction(transcript: string): ParsedTransaction {
  const text = normalize(transcript);
  if (!text) return { type: null, amount: null, description: "" };

  const type = detectType(text);
  const { amount, rest } = findAmount(text);
  const description = extractDescription(rest);

  return { type, amount, description };
}