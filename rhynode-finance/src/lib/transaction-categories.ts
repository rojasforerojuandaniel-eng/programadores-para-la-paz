/**
 * Shared transaction category list.
 *
 * This MUST live in a plain module (no "use client") so Server Components can
 * import the runtime value. Importing it from a "use client" module into a
 * Server Component yields an undefined client-reference proxy at render time.
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
];