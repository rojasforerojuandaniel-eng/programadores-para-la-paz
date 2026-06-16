import { Prisma } from "@/generated/prisma/client";

export function toDecimal(
  value: string | number | Prisma.Decimal | null | undefined
): Prisma.Decimal {
  return new Prisma.Decimal(value ?? 0);
}

export function decimalToNumber(
  value: Prisma.Decimal | number | string | null | undefined
): number {
  return Number(value ?? 0);
}
