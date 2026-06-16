# Fase 4: Finanzas Empresariales — "El Negocio"

**Goal:** Facturación v2, clientes mejorados, proyectos, impuestos colombianos

---

## Tarea 1: Proyectos

Crear desde cero:
- `GET/POST /api/projects/route.ts`
- `src/app/dashboard/projects/page.tsx`
- `src/app/dashboard/projects/create-dialog.tsx`

Modelo `Project` ya existe en Prisma.

## Tarea 2: Facturas v2

Mejorar `/dashboard/invoices` y `/api/invoices`:
- IVA 19% automático en items
- Numeración de facturas (prefijo + secuencia)
- Estados: DRAFT, SENT, PAID, OVERDUE
- Enlace de envío

## Tarea 3: Impuestos Colombianos

Mejorar `/dashboard/tax`:
- IVA 19% en facturas
- ReteFuente brackets
- ICA por ciudad (Bogotá, Medellín, Cali, Barranquilla)
- Calendario de vencimientos

## Tarea 4: Scope Empresarial

Asegurar que invoices, clients, transactions usen `scope: "BUSINESS"`.

---

## Criterios

- [ ] Proyectos: API + página dashboard
- [ ] Facturas v2: IVA 19%, numeración, estados
- [ ] Impuestos: IVA, ReteFuente, ICA
- [ ] Scope empresarial en flujos existentes
- [ ] Build: 0 errores TypeScript
