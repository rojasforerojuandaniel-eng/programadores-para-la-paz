import { decimalToNumber } from "@/lib/decimal";
import { prisma } from "./prisma";
import type { Transaction } from "@/generated/prisma/client";

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

interface KeywordRule {
  keywords: string[];
  category: string;
}

const keywordRules: KeywordRule[] = [
  { keywords: ["rappi", "domicilio", "uber", "didi"], category: "transport_delivery" },
  { keywords: ["netflix", "spotify", "youtube", "disney", "hbo", "prime"], category: "entertainment" },
  { keywords: ["cafe", "tinto", "starbucks", "juan valdez"], category: "coffee" },
  { keywords: ["mercado", "exito", "carulla", "olimpica", "d1", "ara"], category: "groceries" },
  { keywords: ["restaurante", "almuerzo", "desayuno", "cena", "mcdonald", "burguer"], category: "restaurant" },
  { keywords: ["gasolina", "terpel", "texaco", "shell", "mobil"], category: "transport" },
  { keywords: ["claro", "movistar", "tigo", "avantel"], category: "telecommunications" },
  { keywords: ["electricidad", "gas", "agua", "acueducto", "eaab"], category: "utilities" },
  { keywords: ["seguro", "sura", "colpatria", "bolivar"], category: "insurance" },
  { keywords: ["gimnasio", "gym", "smartfit", "bodytech"], category: "health" },
  { keywords: ["universidad", "colegio", "coursera", "udemy"], category: "education" },
  { keywords: ["bancolombia", "davivienda", "nequi", "nu", "rappipay"], category: "transfer_finance" },
  { keywords: ["salud", "medico", "farmacia", "drogas", "colsubsidio"], category: "health" },
  { keywords: ["ropa", "zara", "h&m", "adidas", "nike"], category: "clothing" },
  { keywords: ["viaje", "avianca", "latam", "booking", "airbnb"], category: "travel" },
  { keywords: ["mascota", "veterinaria", "pet"], category: "pets" },
];

export function suggestCategory(
  description: string,
  amount: number
): { category: string; confidence: number } {
  const normalized = normalizeText(description);
  let bestCategory = "";
  let bestConfidence = 0;

  // Keyword matching
  for (const rule of keywordRules) {
    const match = rule.keywords.some((kw) => normalized.includes(kw));
    if (match) {
      bestCategory = rule.category;
      bestConfidence = 0.92;
      break;
    }
  }

  // Amount-based fallback
  if (bestConfidence < 0.7) {
    if (amount < 5000 && /tinto|cafe|pan/.test(normalized)) {
      bestCategory = "coffee";
      bestConfidence = 0.72;
    } else if (amount >= 2000 && amount <= 15000 && /uber|taxi|didi|trans/.test(normalized)) {
      bestCategory = "transport";
      bestConfidence = 0.68;
    } else if (amount > 50000) {
      bestCategory = "shopping";
      bestConfidence = 0.45;
    }
  }

  // Generic fallback
  if (!bestCategory) {
    bestCategory = "other";
    bestConfidence = 0.35;
  }

  return { category: bestCategory, confidence: bestConfidence };
}

export async function autoCategorizeBatch(
  transactions: Transaction[]
): Promise<Transaction[]> {
  const updates: Promise<Transaction>[] = [];

  for (const tx of transactions) {
    const suggestion = suggestCategory(tx.description, decimalToNumber(tx.amount));
    if (suggestion.confidence >= 0.7 && !tx.aiCategory) {
      updates.push(
        prisma.transaction.update({
          where: { id: tx.id },
          data: {
            aiCategory: suggestion.category,
            aiConfidence: suggestion.confidence,
            category: suggestion.category,
          },
        })
      );
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  // Return enriched transactions
  return transactions.map((tx) => {
    if (tx.aiCategory) return tx;
    const suggestion = suggestCategory(tx.description, decimalToNumber(tx.amount));
    if (suggestion.confidence >= 0.7) {
      return { ...tx, aiCategory: suggestion.category, aiConfidence: suggestion.confidence, category: suggestion.category };
    }
    return tx;
  });
}
