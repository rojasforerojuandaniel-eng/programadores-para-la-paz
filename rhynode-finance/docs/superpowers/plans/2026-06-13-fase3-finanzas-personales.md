# Fase 3: Finanzas Personales — "El Día a Día"

**Goal:** Transacciones, cuentas, categorías, presupuestos, metas, deudas, recurrentes

---

## Tarea 1: API Routes

Crear endpoints REST para finanzas personales:

- `GET/POST /api/personal/accounts` — Cuentas personales
- `GET/POST /api/personal/categories` — Categorías jerárquicas
- `GET/POST /api/personal/budgets` — Presupuestos
- `GET/POST /api/personal/goals` — Metas de ahorro
- `GET/POST /api/personal/debts` — Deudas
- `GET/POST /api/personal/recurring` — Transacciones recurrentes

Cada uno con validación Zod y auth via `getUserProfile()`.

---

## Tarea 2: Páginas de Dashboard

Crear páginas bajo `/dashboard/personal/*`:

- `/dashboard/personal/accounts/page.tsx`
- `/dashboard/personal/categories/page.tsx`
- `/dashboard/personal/budgets/page.tsx`
- `/dashboard/personal/goals/page.tsx`
- `/dashboard/personal/debts/page.tsx`
- `/dashboard/personal/recurring/page.tsx`

Cada una con:
- Data table listando registros
- Botón "Crear" con dialog modal
- Empty state con CTA

---

## Tarea 3: Adaptar Transacciones

Extender `/dashboard/transactions` para soportar transacciones personales (scope=PERSONAL).

---

## Criterios

- [ ] 6 APIs REST funcionales
- [ ] 6 páginas de dashboard con CRUD
- [ ] Validación Zod en todos los endpoints
- [ ] Build: 0 errores TypeScript
