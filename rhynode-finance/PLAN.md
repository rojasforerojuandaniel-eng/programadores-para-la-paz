# PLAN DEFINITIVO: RHYNODE FINANCE V2.0

De app de facturación → Plataforma financiera completa

---

## FASE 1: FUNDACIÓN — "EL NÚCLEO" (1-2 días)

**Objetivo:** Schema de datos nuevo + migración de auth a Clerk multi-scope

- [x] 1.1  Nuevo schema Prisma — 30+ modelos (UserProfile, Transaction, Account, Category, Budget, Goal, Debt, Invoice, Project, RecurringTransaction, Receipt, Achievement, NetWorthSnapshot, etc.)
- [x] 1.2  Migración Neon — `prisma db push` aplicado exitosamente
- [x] 1.3  Auth Clerk multi-scope — `UserProfile` creado, `scope` + `hasBusiness` en Organization, utilidades en `src/lib/scope.ts`
- [x] 1.4  Onboarding v2 — Flujo de 2 pasos: selección de modo (Personal/Empresa/Ambas) → configuración de datos
- [x] 1.5  Landing page nueva — 8 componentes desacoplados (navbar, hero, demo, features, compliance, pricing, FAQ, CTA)

**Entrega:** App con nuevo schema, onboarding con selección de modo, landing page completa, auth funcional.
**Build:** 0 errores TypeScript

---

## FASE 2: DASHBOARD V2 — "EL CEREBRO" (2-3 días)

**Objetivo:** Dashboard unificado con scope toggle + widgets + gamificación base

- [x] 2.1  Scope Toggle — Chips Personal / Empresa / Ambas en sidebar desktop y header mobile, persistencia en localStorage + DB
- [x] 2.2  Dashboard widgets — 8 KPIs adaptativos + XP bar + left/right widgets (transacciones/facturas/presupuestos/vencimientos) según scope
- [x] 2.3  Sistema XP v1 — `ACTION_XP` map con 9 acciones, API `POST /api/gamification/track`, tabla `UserActivity`
- [x] 2.4  Niveles y títulos — 100 niveles con curva `100 * n^1.5`, títulos colombianos por tier (Novato → Dios del Dinero)
- [x] 2.5  Rachas — `updateStreak()` con lógica de gaps, bonificación XP en 7 y 30 días
- [x] 2.6  Empty states reales — Ceros y CTAs, sin trends falsos ni datos demo

**Entrega:** Dashboard interactivo con toggle de scope, gamificación funcional, widgets reales.
**Build:** 0 errores TypeScript

---

## FASE 3: FINANZAS PERSONALES — "EL DÍA A DÍA" (2-3 días)

**Objetivo:** Transacciones, cuentas, categorías, presupuestos, metas, deudas

- [x] 3.1  Transacciones v2 — CRUD completo con scope PERSONAL, filtros, búsqueda
- [x] 3.2  Cuentas — 6 tipos (CHECKING, SAVINGS, CASH, CREDIT_CARD, INVESTMENT, LOAN), API + página dashboard
- [x] 3.3  Categorías jerárquicas — Parent/child con iconos, colores, keywords para auto-categorización, API + página dashboard
- [x] 3.4  Auto-categorización — Seed de 22 categorías con keywords (tintos, Rappi, transmilenio, etc.)
- [x] 3.5  Presupuestos — Mensuales por categoría con límite, spent, rollover, alertThreshold, API + página dashboard
- [x] 3.6  Metas de ahorro — Monto objetivo, deadline, progreso visual, API + página dashboard
- [x] 3.7  Deudas — Tipo OWE/OWED, interés, fecha límite, API + página dashboard
- [x] 3.8  Recurrentes — 6 frecuencias (DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY), detección de suscripciones, API + página dashboard

**Entrega:** Finanzas personales completas: transacciones, presupuestos, metas, deudas.
**Build:** 0 errores TypeScript

---

## FASE 4: FINANZAS EMPRESARIALES — "EL NEGOCIO" (2-3 días)

**Objetivo:** Facturación, clientes, proyectos, impuestos, multi-cuenta

- [x] 4.1  Facturas v2 — Numeración automática `INV-{YYYY}-{secuencia}`, IVA 19% default, estados DRAFT/SENT/PAID/OVERDUE, columna Proyecto en tabla
- [x] 4.2  Clientes — Columnas país + historial de facturas (cantidad y total facturado)
- [x] 4.3  Proyectos — API `GET/POST /api/projects`, página dashboard con tabla (nombre, estado, presupuesto, fechas, facturas asociadas), dialog de creación
- [x] 4.4  Impuestos colombianos — API `POST /api/tax/calculate` (IVA 19%, ReteFuente por brackets, ICA por ciudad Bogotá/Medellín/Cali/Barranquilla), calculadora UI, cards informativas, tabla de ejemplos
- [x] 4.5  Scope empresarial — Transacciones filtran `scope: "BUSINESS"`, invoices/clients con scope BUSINESS por default
- [x] 4.6  Payment links — Mantiene Wompi/Stripe existentes

**Entrega:** Módulo empresarial completo: facturas, clientes, proyectos, impuestos.
**Build:** 0 errores TypeScript

---

## FASE 5: INTELIGENCIA — "EL ASESOR" (2-3 días)

**Objetivo:** AI advisor, OCR, gastos hormiga, anomalías, briefing diario

- [x] 5.1  AI Advisor chat — Chat streaming SSE con Anthropic, contexto financiero real, página `/dashboard/advisor`
- [x] 5.2  Parser de transacciones — (MVP: integrado en chat prompt)
- [x] 5.3  OCR de recibos — API `POST /api/ai/ocr`, extracción merchant/total/fecha/items con confidence
- [x] 5.4  Gastos hormiga — API `GET /api/ai/ant-expenses`, 6 patrones colombianos, widget UI con badges de severity
- [x] 5.5  Detección de anomalías — API `GET /api/ai/anomalies`, comparación mes actual vs promedio 2 meses anteriores, >50% flag
- [x] 5.6  Briefing diario — API `GET /api/ai/briefing`, resumen con Anthropic, cache 24h en memoria
- [x] 5.7  Health Score v2 — Círculo SVG 0-100, 5 factores (ahorro, deuda, presupuestos, metas, diversificación), grado A-F

**Entrega:** Inteligencia financiera activa: chat AI, OCR, detecciones, briefing.
**Build:** 0 errores TypeScript

---

## FASE 6: INVERSIÓN Y PATRIMONIO — "EL FUTURO" (1-2 días)

**Objetivo:** Inversiones, patrimonio neto, indicadores económicos

- [x] 6.1  Inversiones — 6 tipos (STOCK, BOND, CRYPTO, ETF, REAL_ESTATE, OTHER), API + página dashboard con performance (valor actual, invertido, retorno %)
- [x] 6.2  Patrimonio neto — API `GET/POST /api/personal/net-worth`, snapshots automáticos (assets = cuentas + inversiones, liabilities = deudas), gráfica de evolución placeholder, página dashboard
- [x] 6.3  Indicadores económicos — Página `/dashboard/economic-indicators` con 5 cards (TRM, Tasa de Intervención, IPC, DTF, UVR), datos mock con tendencias
- [x] 6.4  Calendario financiero — Página `/dashboard/personal/calendar` con eventos de deudas, recurrentes, metas y presupuestos agrupados por semana
- [x] 6.5  Predicciones — API `GET /api/personal/forecast` con regresión lineal simple, proyección 3 meses, insights automáticos

**Entrega:** Visión de largo plazo: inversiones, patrimonio, indicadores, predicciones.
**Build:** 0 errores TypeScript

---

## FASE 7: SOCIAL Y COLABORATIVO — "LA COMUNIDAD" (1-2 días)

**Objetivo:** Presupuestos compartidos, logros, retos, gamificación completa

- [x] 7.1  Presupuestos compartidos — Invite code, roles OWNER/MEMBER
- [x] 7.2  Logros completos — 15 logros en 3 categorías con XP
- [x] 7.3  Niveles 1-100 — Curva exponencial, títulos colombianos
- [x] 7.4  Rachas — Streak tracking, reset por inactividad
- [x] 7.5  Leaderboards (opcional) — Ranking entre usuarios
- [ ] 7.6  Widgets personalizables — Drag & drop de widgets en dashboard

**Entrega:** Gamificación completa, presupuestos colaborativos, logros.

---

## FASE 8: POLISH Y DEPLOY — "LA PERFECCIÓN" (1-2 días)

**Objetivo:** SEO, performance, testing, deploy

- [x] 8.1  SEO exhaustivo — Schema.org, OpenGraph, Twitter Cards, keywords LATAM
- [ ] 8.2  Performance — Core Web Vitals, lazy loading, image optimization (analytics + speed insights activos; optimización de imágenes pendiente)
- [x] 8.3  Responsive — Mobile-first, PWA ready
- [ ] 8.4  Testing — E2E con Playwright, tests críticos (unitarios con Vitest listos; E2E pendiente)
- [x] 8.5  Deploy Vercel — Producción con env vars configuradas
- [x] 8.6  Monetización — Stripe para planes PRO (mantener lo que existe)

**Entrega:** App lista para producción, SEO optimizado, performante, testeado.

---

## Estado

- **Fase actual:** 8 — Polish y Deploy (próximo: widgets personalizables, optimización Core Web Vitals, tests E2E)
- **Última actualización:** 2026-06-15
- **Build:** 0 errores TypeScript
- **Tests:** 12 unitarios pasando
