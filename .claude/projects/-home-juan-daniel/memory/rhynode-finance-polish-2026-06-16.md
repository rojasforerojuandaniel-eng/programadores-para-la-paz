---
name: rhynode-finance-polish-2026-06-16
description: Sesión de pulido Rhynode Finance: fix middleware/auth en producción, indicadores económicos reales, simulador con datos reales, logger estructurado, widget de indicadores y sitemap expandido.
metadata:
  node_type: memory
  type: project
  originSessionId: a14564ee-24cf-4a51-8cfa-d7e98f370070
---

**Trabajo realizado 2026-06-16:**

1. **Fix crítico de auth en producción**
   - El middleware de Clerk con `auth.protect()` causaba errores de Server Components en `/dashboard/*`.
   - Se reemplazó por `clerkMiddleware` con `auth()` explícito y `NextResponse.redirect`/`401`.
   - Se agregó `export const dynamic = "force-dynamic"` en `src/app/dashboard/layout.tsx` para evitar prerender estático de rutas protegidas.
   - Producción ahora responde `307 -> /sign-in` para requests no autenticadas en dashboard.

2. **Indicadores económicos reales de Colombia**
   - Nueva fuente: `https://tasas.agentes-ai.com.co/api/snapshot.json` (CC-BY 4.0).
   - Servicio `src/lib/economic-indicators.ts` con cache de 1h (`next.revalidate`), fallback a datos de referencia y atribución.
   - API pública `/api/economic-indicators` y página `/dashboard/economic-indicators` refactorizada a Server Component.
   - Datos mostrados: TRM, Tasa de Intervención, Inflación Anual, UVR, IBR Overnight.

3. **Simulador de escenarios con datos reales**
   - Nuevo endpoint `/api/personal/scenarios/summary` que devuelve balance actual, ingresos/gastos mensuales y ahorro.
   - Página `/dashboard/personal/scenarios` ahora precarga los valores reales del usuario con fallback a defaults.

4. **Logger estructurado en toda la API**
   - Reemplazo masivo de `console.error` por `logger.error` en rutas de API y componentes.
   - Build/lint sin errores de TypeScript; solo warnings restantes en scripts de Prisma y `logger.ts` intencional.

5. **Widget de indicadores en dashboard principal**
   - Nuevo componente `src/components/dashboard/economic-indicators-widget.tsx`.
   - Agregado al sistema de widgets drag-and-drop con `defaultVisible: true`.

6. **Sitemap expandido**
   - `src/app/sitemap.ts` ahora incluye rutas públicas legales/app y rutas principales del dashboard.

**Estado:** Producción deployada en `https://rhynode-finance.vercel.app`, build 0 errores, middleware redirige correctamente, APIs responden 200, logs sin errores de runtime.

**Por qué importa:** Cierra un bug de auth que rompía la experiencia en producción y eleva la percepción de producto real con datos financieros colombianos vivos en lugar de mocks.

**Cómo aplicar:** Seguir iterando en áreas visibles (investment allocation chart, net worth history, empty states, a11y audit, performance) y mantener la regla de build 0 errores antes de cada deploy.
