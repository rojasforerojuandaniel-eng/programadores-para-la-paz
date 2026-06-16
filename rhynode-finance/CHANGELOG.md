# Changelog

Todos los cambios notables de Rhynode Finance se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added

- Páginas legales: `/privacy`, `/terms`, `/support`.
- Workflow de GitHub Actions para CI/CD (type-check, lint, tests, deploy a Vercel).
- Pre-commit hook con `lint-staged`.
- Logger estructurado en `src/lib/logger.ts` y migración de rutas críticas.
- Tests unitarios con Vitest (23 tests) para helpers de decimal, categorización, suscripciones y niveles.
- Tests E2E con Playwright (smoke tests de landing, auth y redirección de dashboard).

### Changed

- Metadata SEO específica por página (landing, auth, onboarding, dashboard y subpáginas).
- Navegación móvil de la landing funcional con Sheet.
- Mejoras de accesibilidad: contraste, landmarks `<main>`, skip-to-content link.
- Lazy loading de componentes pesados (recharts, analytics, PWA install prompt) para mejorar Core Web Vitals.
- Widgets del dashboard personalizables con drag-and-drop y persistencia.
- Sentry para monitoreo de errores y performance.
- Exportación CSV de transacciones.
- Logger estructurado en rutas críticas.

### Fixed

- Acceso público al deployment de producción desactivando Vercel Authentication.
- Eliminado archivo `.env` local del repositorio.

## [0.1.0] - 2026-06-13

### Added

- Rhynode Finance v2.0 baseline.
- Schema Prisma con 30+ modelos.
- Auth multi-scope con Clerk.
- Dashboard con KPIs, gamificación, health score, anomalías y gastos hormiga.
- Módulos personales: cuentas, presupuestos, metas, deudas, recurrentes, inversiones, patrimonio.
- Módulos empresariales: facturas DIAN, clientes, proyectos, impuestos, links de pago.
- AI advisor chat, OCR de recibos, detección de suscripciones, calendario financiero.
- PWA completa con service worker, manifest y push notifications.
- Integración Stripe/Wompi para suscripciones y cobros.
