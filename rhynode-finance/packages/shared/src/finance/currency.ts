export const FALLBACK_TRM = 4000;

export interface TrmResult {
  value: number;
  asOf: string;
}

export function convertToCop(
  amount: number,
  fromCurrency: string,
  trm?: TrmResult | null,
  rates?: Record<string, number>,
): { cop: number; converted: boolean } {
  const currency = fromCurrency.toUpperCase();
  if (currency === "COP" || !currency) return { cop: amount, converted: false };
  if (currency === "USD") {
    const value = trm?.value ?? FALLBACK_TRM;
    return { cop: amount * value, converted: true };
  }
  const rateMap = rates ?? {};
  const rate = rateMap[currency];
  if (typeof rate === "number" && rate > 0) {
    return { cop: amount * rate, converted: true };
  }
  return { cop: amount, converted: false };
}
