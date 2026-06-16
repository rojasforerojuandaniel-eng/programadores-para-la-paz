import { decimalToNumber } from "@/lib/decimal";
import type { Transaction } from "@/generated/prisma/client";

export interface DetectedSubscriptionData {
  name: string;
  description: string;
  amount: number;
  currency: string;
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY";
  provider: string | null;
  category: string | null;
  confidence: number;
}

function normalizeDescription(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\d+/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const knownSubscriptionKeywords = [
  "netflix", "spotify", "youtube", "disney", "hbo", "prime",
  "gym", "gimnasio", "smartfit", "bodytech",
  "seguro", "insurance", "sura", "colpatria", "bolivar",
  "claro", "movistar", "tigo", "avantel",
  "internet", "fibra", "cable",
  "apple", "icloud", "google", "microsoft", "office",
  "dropbox", "notion", "slack", "zoom",
  "hbo", "paramount", "crunchyroll",
  "tinder", "bumble", "match",
  "duolingo", "busuu", "coursera", "udemy",
  "linkedin", "premium",
];

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

export function detectSubscriptions(
  transactions: Transaction[]
): DetectedSubscriptionData[] {
  const groups = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const normalized = normalizeDescription(tx.description);
    if (!normalized) continue;
    const key = normalized;
    const list = groups.get(key) || [];
    list.push(tx);
    groups.set(key, list);
  }

  const results: DetectedSubscriptionData[] = [];

  for (const [key, txs] of groups.entries()) {
    if (txs.length < 2) continue;

    const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());
    const amounts = sorted.map((t) => decimalToNumber(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);
    const amountVariance = avgAmount > 0 ? (maxAmount - minAmount) / avgAmount : 0;

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    let frequency: "MONTHLY" | "QUARTERLY" | "YEARLY" | null = null;
    if (avgGap >= 28 && avgGap <= 32) frequency = "MONTHLY";
    else if (avgGap >= 85 && avgGap <= 95) frequency = "QUARTERLY";
    else if (avgGap >= 355 && avgGap <= 370) frequency = "YEARLY";

    const hasSubscriptionKeyword = knownSubscriptionKeywords.some((kw) =>
      key.includes(kw)
    );

    let confidence = 0;
    if (hasSubscriptionKeyword) confidence += 0.3;
    if (amountVariance < 0.05) confidence += 0.3;
    else if (amountVariance < 0.1) confidence += 0.2;
    if (frequency) confidence += 0.3;
    if (sorted.length >= 3) confidence += 0.1;
    confidence = Math.min(confidence, 1);

    // Also allow known subscription keywords even with only 2 transactions and no perfect interval
    if (hasSubscriptionKeyword && sorted.length >= 2 && amountVariance < 0.15 && !frequency) {
      frequency = "MONTHLY";
      confidence = Math.max(confidence, 0.55);
    }

    if (!frequency) continue;

    const lastTx = sorted[sorted.length - 1];
    const originalDescription = lastTx.description;
    const provider = originalDescription.split(/\s/)[0] || originalDescription;

    results.push({
      name: originalDescription,
      description: originalDescription,
      amount: avgAmount,
      currency: lastTx.currency,
      frequency,
      provider,
      category: lastTx.category || null,
      confidence,
    });
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}
