# Fase 2: Dashboard V2 — "El Cerebro"

**Goal:** Dashboard unificado con scope toggle + 16 widgets + gamificación base (XP, niveles, rachas).

---

## Task 1: Scope Toggle + Context

**Files:**
- Create: `src/components/dashboard/scope-toggle.tsx`
- Create: `src/lib/scope-context.tsx`
- Modify: `src/components/dashboard/sidebar.tsx`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Scope context**
  Crear `src/lib/scope-context.tsx` con React Context:
  - `scope: UserScope` (PERSONAL | BUSINESS | BOTH)
  - `setScope(scope)` — guarda en localStorage
  - Lee de localStorage al inicializar

- [ ] **Step 2: Scope Toggle component**
  `src/components/dashboard/scope-toggle.tsx`:
  - Tabs estilo chip: "Personal" | "Empresa" | "Ambas"
  - Visual activo con primary color
  - Solo visible si `hasBusiness` en el perfil

- [ ] **Step 3: Integrar en sidebar**
  Agregar scope toggle en la parte superior del sidebar (desktop) y en el header mobile.

- [ ] **Step 4: Commit**

---

## Task 2: Dashboard Widgets (16)

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Create: `src/components/dashboard/widgets/kpi-grid.tsx`
- Create: `src/components/dashboard/widgets/invoice-status.tsx`
- Create: `src/components/dashboard/widgets/upcoming-deadlines.tsx`
- Create: `src/components/dashboard/widgets/personal-summary.tsx`
- Create: `src/components/dashboard/widgets/health-score.tsx`
- Create: `src/components/dashboard/widgets/recent-activity.tsx`
- Create: `src/components/dashboard/widgets/achievements.tsx`

- [ ] **Step 1: KPI Grid** — 8 tarjetas de resumen (adaptativas según scope)
  - PERSONAL: balance total, ingresos mes, gastos mes, ahorro, cuentas, presupuestos, metas activas, deudas
  - BUSINESS: facturado, cobrado, pendiente, vencido, clientes, impuestos, saldo bancario, facturas

- [ ] **Step 2: Personal widgets**
  - `personal-summary.tsx` — Balance, ingresos, gastos del mes actual
  - `health-score.tsx` — Score 0-100 placeholder (Fase 5 lo llena)
  - `recent-activity.tsx` — Últimas 5 transacciones

- [ ] **Step 3: Business widgets**
  - `invoice-status.tsx` — Estados de facturas (ya existe, extraer a componente)
  - `upcoming-deadlines.tsx` — Próximos vencimientos (ya existe, extraer)

- [ ] **Step 4: Gamification widgets**
  - `achievements.tsx` — XP, nivel actual, barra de progreso, racha de días

- [ ] **Step 5: Componer page.tsx**
  - Usar ScopeContext para decidir qué widgets renderizar
  - Empty states con CTAs reales (no datos demo)

---

## Task 3: Sistema de Gamificación

**Files:**
- Create: `src/lib/gamification.ts`
- Create: `src/lib/levels.ts`
- Create: `src/app/api/gamification/track/route.ts`

- [ ] **Step 1: XP System**
  `src/lib/gamification.ts`:
  - `ACTION_XP` map: crear transacción (+10), completar meta (+50), crear presupuesto (+20), streak 7 días (+25), etc.
  - `addXp(userId, action)` — calcula XP, actualiza nivel si corresponde

- [ ] **Step 2: Levels + Titles**
  `src/lib/levels.ts`:
  - 100 niveles con curva exponencial: `xpForLevel(n) = 100 * n^1.5`
  - Títulos colombianos por rango:
    - 1-10: "Ahorrador Principiante" → "Aprendiz de Presupuesto"
    - 11-25: "Administrador de Gastos" → "Controlador de Finanzas"
    - 26-50: "Capitán del Ahorro" → "Maestro del Cash Flow"
    - 51-75: "Inversionista en Formación" → "Tiburón de las Finanzas"
    - 76-100: "Emperador del Patrimonio" → "Dios del Dinero"

- [ ] **Step 3: Streaks**
  - `updateStreak(userId)` — compara lastActiveAt con hoy
  - Si ayer: streak++
  - Si hoy: no-op
  - Si gap > 1 día: reset a 1

- [ ] **Step 4: API endpoint**
  `POST /api/gamification/track` — recibe action, actualiza XP y streak

- [ ] **Step 5: Commit**

---

## Criterios de aceptación

- [ ] Scope toggle visible y funcional en sidebar
- [ ] Dashboard muestra widgets diferentes según scope seleccionado
- [ ] 16 widgets renderizados (8 KPIs + 6 secciones + gamificación)
- [ ] Empty states con CTAs reales (no demo data)
- [ ] XP se calcula correctamente, niveles suben
- [ ] Rachas funcionan (incrementan, resetan por gap)
- [ ] Build: 0 errores TypeScript
