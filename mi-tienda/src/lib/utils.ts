import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

// Format raffle ticket number with leading zeros (min 3 digits)
// Example: 1 → "001", 42 → "042", 999 → "999", 1000 → "1000"
// totalNumbers se conserva por compatibilidad de firma (ya no afecta el formato)
export function formatTicketNumber(number: number, totalNumbers?: number): string {
  void totalNumbers;
  return String(number).padStart(3, "0");
}

// Una boleta cuenta como vendida si está vendida o si fue la ganadora del sorteo
export function isSoldTicket(status: string): boolean {
  return status === "sold" || status === "winner";
}

// Límites de negocio para validación de entrada
// Máximo 999 números: formato uniforme de 3 cifras (001-999)
export const MAX_RAFFLE_NUMBERS = 999;
export const MAX_STICKER_COUNT = 100000;

// Escapa comodines de SQL LIKE para búsquedas con `contains`
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "");
}

// Normaliza un número de teléfono colombiano a 10 dígitos sin prefijo de país.
// Maneja todos los formatos comunes:
// "+57 300 123 4567" → "3001234567"
// "573001234567" → "3001234567"
// "3001234567" → "3001234567"
// "+57 312 345 6789" → "3123456789"
// "0300123456" → "300123456" (quita el 0 inicial si queda en 11 dígitos)
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/[^\d]/g, "");
  // Si empieza con 57 (código de país) y tiene 12+ dígitos, quitar el prefijo
  if (digits.startsWith("57") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  // Si tiene 11 dígitos y empieza con 0, quitar el 0 (común en Colombia)
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}
