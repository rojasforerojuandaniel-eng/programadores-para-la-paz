import { getPrisma } from "@/lib/prisma";

export interface RuleSuggestion {
  name: string;
  conditionValue: string;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  frequency: number;
  averageAmount: number;
  exampleDescriptions: string[];
}

function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

function pickKeyword(normalized: string): string {
  const stopWords = new Set([
    "el", "la", "los", "las", "un", "una", "de", "del", "al", "y", "o", "en",
    "con", "por", "para", "a", "ante", "bajo", "desde", "hasta", "entre", "sobre",
    "tras", "the", "of", "and", "or", "in", "on", "at", "to", "for", "with",
    "sas", "sa", "ltda", "limitada", "co", "com", "compra", "pago", "transferencia",
  ]);
  const words = normalized.split(" ").filter((w) => w.length >= 3 && !stopWords.has(w));
  return words[0] ?? normalized.split(" ").filter((w) => w.length > 0)[0] ?? normalized;
}

function findSuggestedCategory(
  description: string,
  categories: { id: string; name: string; keywords: unknown }[]
): { id: string; name: string } | null {
  const normalized = normalizeDescription(description);
  const words = new Set(normalized.split(" "));

  for (const category of categories) {
    const nameWords = normalizeDescription(category.name).split(" ");
    if (nameWords.some((word) => word.length >= 3 && words.has(word))) {
      return { id: category.id, name: category.name };
    }

    const categoryKeywords = Array.isArray(category.keywords)
      ? category.keywords
          .map((k) => (typeof k === "string" ? normalizeDescription(k) : ""))
          .filter(Boolean)
      : [];
    if (categoryKeywords.some((keyword) => normalized.includes(keyword))) {
      return { id: category.id, name: category.name };
    }
  }

  return null;
}

export interface GenerateSuggestionsOptions {
  minFrequency?: number;
  lookbackDays?: number;
  maxSuggestions?: number;
}

export async function generateRuleSuggestions(
  userId: string,
  options: GenerateSuggestionsOptions = {}
): Promise<RuleSuggestion[]> {
  const { minFrequency = 2, lookbackDays = 90, maxSuggestions = 10 } = options;

  const prisma = getPrisma();
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);

  const [uncategorized, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        categoryId: null,
        date: { gte: since },
      },
      select: { description: true, amount: true },
    }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, keywords: true },
    }),
  ]);

  const groups = new Map<
    string,
    { descriptions: string[]; amounts: number[]; example: string }
  >();

  for (const transaction of uncategorized) {
    const normalized = normalizeDescription(transaction.description);
    if (!normalized) continue;

    const existing = groups.get(normalized);
    const amount = Number(transaction.amount);
    if (existing) {
      existing.descriptions.push(transaction.description);
      existing.amounts.push(amount);
    } else {
      groups.set(normalized, {
        descriptions: [transaction.description],
        amounts: [amount],
        example: transaction.description,
      });
    }
  }

  const suggestions: RuleSuggestion[] = [];
  for (const [normalized, group] of groups.entries()) {
    if (group.amounts.length < minFrequency) continue;

    const keyword = pickKeyword(normalized);
    const averageAmount =
      group.amounts.reduce((sum, amount) => sum + amount, 0) / group.amounts.length;
    const category = findSuggestedCategory(group.example, categories);
    const uniqueDescriptions = Array.from(new Set(group.descriptions)).slice(0, 3);

    suggestions.push({
      name: `Gastos en ${group.example}`,
      conditionValue: keyword,
      suggestedCategoryId: category?.id ?? null,
      suggestedCategoryName: category?.name ?? null,
      frequency: group.amounts.length,
      averageAmount,
      exampleDescriptions: uniqueDescriptions,
    });
  }

  suggestions.sort((a, b) => b.frequency - a.frequency);
  return suggestions.slice(0, maxSuggestions);
}
