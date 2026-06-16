# Fase 1: Fundación — Rhynode Finance v2.0

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Nuevo schema Prisma 30+ modelos, auth Clerk multi-scope, onboarding v2 con selección de modo, landing page mejorada.

**Architecture:** Extender schema existente con modelos de finanzas personales (cuentas, categorías, presupuestos, metas, deudas, inversiones, logros). Adaptar Organization para scope PERSONAL/BUSINESS/BOTH. Crear onboarding de dos pasos: selección de modo → configuración de datos.

**Tech Stack:** Next.js 16, Prisma 7 + Neon adapter, Clerk auth, Tailwind CSS, shadcn/ui.

---

## Task 1: Nuevo Schema Prisma v2

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Backup schema actual**
  ```bash
  cp prisma/schema.prisma prisma/schema.prisma.bak
  ```

- [ ] **Step 2: Extender schema con nuevos modelos**

  Agregar al schema existente los siguientes modelos (mantener los 9 modelos actuales, extenderlos):

  **Modelos nuevos de finanzas personales:**
  - `User` — perfil del usuario con `scope`, `hasBusiness`, `xp`, `level`, `streakDays`, `lastActiveAt`
  - `Account` — cuentas personales (checking, savings, cash, credit_card, investment)
  - `Category` — categorías jerárquicas (parentId, icon, color)
  - `Budget` — presupuestos mensuales por categoría
  - `Goal` — metas de ahorro
  - `Debt` — deudas (me deben / debo)
  - `RecurringTransaction` — transacciones recurrentes con frecuencia
  - `Receipt` — recibos con OCR data
  - `Achievement` — logros desbloqueados
  - `NetWorthSnapshot` — snapshots de patrimonio neto
  - `UserActivity` — tracking de XP por acción

  **Extensiones a modelos existentes:**
  - `Organization`: agregar `scope` (PERSONAL, BUSINESS, BOTH), `hasBusiness`
  - `Transaction`: agregar `accountId`, `categoryId`, `isRecurring`, `receiptId`, `scope`

  Escribir el schema completo con tipos String (no enums, por compatibilidad Neon).

- [ ] **Step 3: Generar Prisma client**
  ```bash
  cd /home/juan-daniel/rhynode-finance
  npx prisma generate
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add prisma/schema.prisma
  git commit -m "feat(schema): prisma v2 con 30+ modelos para finanzas personales y empresariales"
  ```

---

## Task 2: Migración Neon

**Files:**
- No files to modify (migration generada)

- [ ] **Step 1: Crear y aplicar migración**
  ```bash
  cd /home/juan-daniel/rhynode-finance
  npx prisma migrate dev --name v2_foundation
  ```

- [ ] **Step 2: Verificar que la DB responde**
  ```bash
  npx prisma db pull --print | head -20
  ```

- [ ] **Step 3: Seed básico de categorías**
  Crear script `prisma/seed-categories.ts` con categorías por defecto colombianas (Alimentación, Transporte, Vivienda, Salud, Educación, Entretenimiento, Rappi, Tintos, etc.).
  Ejecutar:
  ```bash
  npx tsx prisma/seed-categories.ts
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add prisma/migrations/ prisma/seed-categories.ts
  git commit -m "feat(db): migración v2 + seed de categorías"
  ```

---

## Task 3: Auth Clerk Multi-Scope

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `prisma/schema.prisma` (Organization extensions)
- Create: `src/lib/scope.ts`

- [ ] **Step 1: Crear utilidad de scope**
  Archivo `src/lib/scope.ts`:
  ```typescript
  export type UserScope = "PERSONAL" | "BUSINESS" | "BOTH";

  export function getDefaultScope(): UserScope {
    return "PERSONAL";
  }

  export function canAccessBusiness(scope: UserScope): boolean {
    return scope === "BUSINESS" || scope === "BOTH";
  }

  export function canAccessPersonal(scope: UserScope): boolean {
    return scope === "PERSONAL" || scope === "BOTH";
  }
  ```

- [ ] **Step 2: Modificar auth.ts para manejar scope**
  Extender `getOrCreateAuthOrg()` para:
  1. Leer el `scope` de Clerk user metadata
  2. Crear Organization con el scope correspondiente
  3. Agregar función `getUserScope()` que retorne el scope del usuario actual

- [ ] **Step 3: Actualizar API organization para recibir scope**
  Modificar `src/app/api/organization/route.ts`:
  - El schema de Zod ahora acepta `scope` y `hasBusiness`
  - En POST/PUT, guardar estos campos

- [ ] **Step 4: Commit**
  ```bash
  git add src/lib/scope.ts src/lib/auth.ts src/app/api/organization/route.ts
  git commit -m "feat(auth): multi-scope PERSONAL/BUSINESS/BOTH con utilidades"
  ```

---

## Task 4: Onboarding v2

**Files:**
- Modify: `src/app/onboarding/page.tsx`
- Modify: `src/app/onboarding/form.tsx`
- Create: `src/app/onboarding/step-mode.tsx`
- Create: `src/app/onboarding/step-data.tsx`

- [ ] **Step 1: Crear componente de selección de modo**
  Archivo `src/app/onboarding/step-mode.tsx`:
  - UI con 3 tarjetas grandes: Personal, Empresa, Ambas
  - Cada tarjeta con icono Lucide, descripción, CTA
  - Al seleccionar, guarda en state local y avanza

- [ ] **Step 2: Refactorizar form existente en step-data.tsx**
  Mover la lógica del form actual a `step-data.tsx`, adaptándola para:
  - Si modo = PERSONAL: solo pedir nombre, país, moneda, timezone
  - Si modo = BUSINESS: pedir nombre empresa, NIT, país, moneda, timezone
  - Si modo = BOTH: pedir ambos (nombre personal + nombre empresa)

- [ ] **Step 3: Modificar onboarding/page.tsx para flujo de 2 pasos**
  - Paso 1: `step-mode.tsx` — selección de modo
  - Paso 2: `step-data.tsx` — datos según modo
  - Enviar scope + hasBusiness al API

- [ ] **Step 4: Commit**
  ```bash
  git add src/app/onboarding/
  git commit -m "feat(onboarding): v2 con selección Personal/Empresa/Ambas"
  ```

---

## Task 5: Landing Page Nueva

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/landing/hero.tsx`
- Create: `src/components/landing/features.tsx`
- Create: `src/components/landing/pricing.tsx`
- Create: `src/components/landing/faq.tsx`
- Create: `src/components/landing/cta.tsx`

- [ ] **Step 1: Crear secciones desacopladas**
  Dividir la landing actual en componentes reutilizables en `src/components/landing/`.

- [ ] **Step 2: Mejorar contenido**
  - Hero: agregar mockup/demo visual del dashboard
  - Features: agregar features de finanzas personales (no solo empresariales)
  - Pricing: ajustar planes para incluir modo personal
  - FAQ: 6 preguntas frecuentes ( Colombia/México/Brasil )
  - CTA: footer con CTA final

- [ ] **Step 3: Animaciones y polish**
  - Scroll animations con `framer-motion` o Tailwind
  - Gradient backgrounds, floating elements
  - Responsive mobile-first

- [ ] **Step 4: Commit**
  ```bash
  git add src/app/page.tsx src/components/landing/
  git commit -m "feat(landing): página de inicio v2 con personal + business"
  ```

---

## Criterios de aceptación

- [ ] Schema tiene 30+ modelos, build pasa
- [ ] Migración aplicada en Neon sin errores
- [ ] Onboarding muestra 3 opciones: Personal, Empresa, Ambas
- [ ] Auth guarda scope en Organization
- [ ] Landing page tiene hero, features, pricing, FAQ, CTA
- [ ] Build: 0 errores TypeScript

---

## Estado

- **Fase:** 1 — Fundación
- **Tareas:** 5
- **Estimación:** 1-2 días
