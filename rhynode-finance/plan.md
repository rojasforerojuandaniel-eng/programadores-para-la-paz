# Plan: Rhynode Mega-Roadmap — De project a product

## Contexto

Rhynode apunta a ser la app de finanzas personales e inteligencia contable líder para Colombia, con un funnel natural hacia herramientas de negocio:

- **B2C**: finanzas personales (presupuestos, metas, gastos, suscripciones, deudas, inversiones).
- **B2B**: facturación electrónica DIAN, clientes, cuentas por cobrar, impuestos y reportes para pymes.
- **Funnel**: los usuarios personales descubren las herramientas de empresa y pueden activar el modo Empresa/Ambas cuando crecen.

Este plan implementa **todo lo que es posible hacer en una sesión de código** y documenta claramente qué requiere dependencias externas.

## Honestidad técnica

**NO se puede implementar en código:**
- Sync bancario real (Finerio Connect requiere contrato comercial, SFC APIs aún no publicadas)
- App nativa iOS/Android (requiere Xcode, Android Studio, publicación en App Store/Play Store)
- Certificación SOC 2 / ISO 27001 (requiere auditoría externa, 3-6 meses)
- Facturación electrónica DIAN certificada (requiere software autorizado por la DIAN)

**SÍ se puede implementar ahora:**
- PWA completa con push notifications y offline mode
- AI categorización automática con reglas + ML lightweight
- Subscription detection con alertas de subida de precio
- Scenario modeling / "What If" calculator
- Onboarding simplificado de 2 pasos técnicos a 1 paso simple
- Stripe Checkout conectado a la landing pricing
- Encriptación de datos sensibles en DB
- Rate limiting reforzado y security headers mejorados
- Prep para Open Banking (modelo Integration ya existe, falta UI)

## Fases

### ✅ Fase 0: Diseño mobile-first y branding trust-first
- `src/app/globals.css` — Nuevo design system: slate/navy + indigo/primary, emerald success, rose danger.
- `src/components/landing/landing-page.tsx` — Landing page B2C/B2B mobile-first con trust badges y pricing freemium.
- `src/components/dashboard/sidebar.tsx` — Bottom navigation mobile-first + menú lateral sheet + scope toggle.
- `src/app/dashboard/layout.tsx` — Padding ajustado para header/bottom nav móvil.
- `src/app/dashboard/advisor/page.tsx` — Chat mobile-first con altura dinámica.
- `src/app/dashboard/personal/*` — Rediseño mobile-first de páginas personales.
- `docs/native-apps-plan.md` — Estrategia de apps nativas iOS/Android.

### ✅ Fase 1: PWA Completa (service worker, push, offline)
- `public/sw.js` — Service worker con cache-first strategy y cache name v2.
- `public/manifest.json` — Actualizado con branding Rhynode, screenshots, shortcuts, categories.
- `src/lib/push.ts` — Helpers para suscripción a push notifications.
- `src/components/pwa/install-prompt.tsx` — Custom install prompt con branding Rhynode.
- `src/app/layout.tsx` — Register service worker, theme-color dinámico.

### Fase 2: AI Categorización Automática
- `prisma/schema.prisma` — Add `aiCategory String?` y `aiConfidence Float?` a Transaction
- `src/lib/categorizer.ts` — Motor de categorización basado en:
  - Keywords (regex-based rules for LATAM patterns: Rappi, Netflix, Bancolombia, etc.)
  - Amount ranges (transporte típico ~2.5k-15k COP)
  - Time patterns (almuerzos 12-2pm, transporte 6-9am)
- `src/app/api/ai/categorize/route.ts` — Endpoint POST que recibe descripción+monto y devuelve categoría + confianza
- `src/app/api/transactions/route.ts` — Auto-apply categorization on create
- `src/components/dashboard/create-transaction-dialog.tsx` — Mostrar sugerencia AI antes de guardar
- `src/app/dashboard/personal/categories/page.tsx` — Add "Categorizar con AI" bulk action

### Fase 3: Subscription Detection & Management
- `prisma/schema.prisma` — Add `Subscription` model with price history tracking
- `src/lib/subscription-detector.ts` — Algoritmo que analiza transactions y detecta patrones recurrentes
- `src/app/api/personal/subscriptions/route.ts` — CRUD + detection endpoint
- `src/app/api/personal/subscriptions/detect/route.ts` — POST que escanea transactions y detecta subs
- `src/app/dashboard/personal/subscriptions/page.tsx` — UI con:
  - Lista de suscripciones detectadas
  - Alerta cuando sube de precio (comparación mes a mes)
  - Total mensual de subs
  - Badge "Sin usar" si no hay transacciones recientes
- `src/components/dashboard/right-widget.tsx` — Add subscription mini-widget

### Fase 4: Scenario Modeling ("What If")
- `src/app/dashboard/personal/scenarios/page.tsx` — Calculadora con sliders:
  - Aumento de salario (%)
  - Nuevo gasto mensual ($)
  - Compra grande (cuotas)
  - Ahorro objetivo ($/mes)
  - Gráfico de impacto en balance a 6/12/24 meses
- Usar recharts para visualizar proyección

### ✅ Fase 5: Onboarding Simplificado
- `src/app/onboarding/onboarding-flow.tsx` — Flujo de 2 pasos mobile-first: modo (Personal/Empresa/Ambas) + datos básicos.
- `src/app/onboarding/step-mode.tsx` — Cards grandes con touch targets adecuados.
- `src/app/onboarding/step-data.tsx` — Formulario compacto con país/moneda/zona horaria sincronizados y NIT opcional.
- Trust badges al pie: encriptación de datos, cumplimiento DIAN, sin tarjeta de crédito.

### Fase 6: Stripe Checkout Real
- `src/components/landing/landing-pricing.tsx` — Conectar botones a `/api/subscribe`
- `src/app/dashboard/settings/page.tsx` — Add "Billing" tab con:
  - Plan actual
  - Botón "Upgrade"
  - Historial de pagos
  - Cancelar suscripción
- `src/app/api/subscribe/cancel/route.ts` — Cancelar Stripe subscription
- `src/app/api/subscribe/portal/route.ts` — Stripe Customer Portal

### Fase 7: Seguridad + Encriptación
- `src/lib/crypto.ts` — Helpers para encrypt/decrypt con AES-256-GCM
- `src/app/api/transactions/route.ts` — Encrypt sensitive fields (description cuando contiene datos personales)
- `src/lib/rate-limit.ts` — Agregar rate limiting por IP para todas las API routes
- `middleware.ts` — Mejorar con rate limiting headers y CSP más estricto

### Fase 8: Prep para Open Banking
- `src/app/dashboard/integrations/page.tsx` — UI para conectar bancos:
  - Placeholder para Bancolombia, Davivienda, Nequi, Banco de Bogotá
  - Estado "Próximamente" con botón "Notificarme"
  - Mock de conexión para demo
- `src/app/api/integrations/banks/route.ts` — CRUD para Integration model con provider="BANK"
- Documentar que esto requiere Finerio Connect o APIs SFC

## Dependencias a instalar
- `next-pwa` o `@ducanh2912/next-pwa` para service worker
- `web-push` para push notifications
- `crypto-js` o usar Web Crypto API nativo

## Apps nativas

Ver `docs/native-apps-plan.md` para la estrategia de iOS/Android con Expo + PWA capuchoneada y migración progresiva a React Native.

## Notas
- Max 2-3 agentes paralelos para no colapsar RAM
- Priorizar Fase 1 → Fase 2 → Fase 3 en secuencia (cada una depende del build anterior)
- Fases 4-8 pueden correr en paralelo después de que Fase 1-3 estén estables
