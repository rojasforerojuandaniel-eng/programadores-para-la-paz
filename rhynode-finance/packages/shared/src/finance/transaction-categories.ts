/**
 * Shared transaction category list. Plain runtime values usable in both
 * React Server Components and React Native.
 */
export const COMMON_CATEGORIES = [
  "Ventas",
  "Nómina",
  "Servicios",
  "Materiales",
  "Marketing",
  "Transporte / Delivery",
  "Entretenimiento",
  "Café",
  "Mercado",
  "Restaurante",
  "Transporte",
  "Telecomunicaciones",
  "Servicios públicos",
  "Seguros",
  "Salud",
  "Educación",
  "Transferencia/Finanzas",
  "Ropa",
  "Viajes",
  "Mascotas",
  "Compras",
  "Otros",
] as const;

export type CommonCategory = (typeof COMMON_CATEGORIES)[number];
