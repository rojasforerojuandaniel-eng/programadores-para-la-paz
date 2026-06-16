# Rhynode

Finanzas personales e inteligencia contable para Colombia.

Rhynode une finanzas personales y operaciones de negocio en una sola plataforma. Controla tu dinero, ahorra con inteligencia, factura electrónicamente y cumple con tus obligaciones tributarias.

## Posicionamiento

- **B2C**: app de finanzas personales con presupuestos, metas, seguimiento de gastos, suscripciones, deudas e inversiones.
- **B2B**: facturación electrónica DIAN, cuentas por cobrar, clientes, impuestos y reportes para pymes.
- **Funnel**: los usuarios personales descubren las herramientas de negocio y pueden activar el modo Empresa/Ambas cuando crecen.

## Stack

- **Next.js 16** (App Router, Server Components, Turbopack)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 4**
- **Prisma ORM** + **Neon Postgres**
- **Clerk** (auth)
- **Stripe** (suscripciones + payment links)
- **Wompi** (pagos locales Colombia)

## Features

### Personal
- Presupuestos inteligentes con alertas
- Metas de ahorro con progreso visual
- Seguimiento automático de gastos
- Detección de suscripciones y subidas de precio
- Calendario de pagos y metas
- Simulador de escenarios "qué pasa si"
- Patrimonio e inversiones

### Negocio
- Facturación electrónica (estructura DIAN-ready)
- Gestión de clientes y proyectos
- Cuentas por cobrar con recordatorios
- Links de cobro con Stripe + Wompi
- Reportes fiscales pre-llenados
- Multi-moneda (COP, MXN, BRL, ARS, CLP, PEN, USD)

## Getting Started

```bash
npm install
# Copia .env.example a .env.local y llena tus secrets
cp .env.example .env.local
npx prisma generate
npm run dev
```

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:push` | Push schema a Neon |
| `npm run db:studio` | Prisma Studio |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests E2E (Playwright) |
| `npm run lint` | ESLint |

## CI/CD

Cada push a `main` dispara el workflow de GitHub Actions:
1. Type-check con `tsc --noEmit`
2. Lint con ESLint
3. Tests unitarios con Vitest
4. Deploy a Vercel production

Requiere configurar el secret `VERCEL_TOKEN` en GitHub.

## Environment Variables

Requeridas para producción:

| Variable | Propósito |
|----------|-----------|
| `DATABASE_URL` | Neon Postgres connection string |
| `CLERK_SECRET_KEY` | Clerk server key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client key |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_STARTER_PRICE_ID` | Stripe price ID plan Starter |
| `STRIPE_GROWTH_PRICE_ID` | Stripe price ID plan Growth |
| `STRIPE_SCALE_PRICE_ID` | Stripe price ID plan Scale |
| `WOMPI_PUBLIC_KEY` | Wompi public key (Colombia) |
| `WOMPI_PRIVATE_KEY` | Wompi private key |
| `WOMPI_EVENTS_KEY` | Wompi events key para verificar webhooks |
| `CRON_SECRET` | Secret para cron jobs |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID para push notifications |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | DSN de Sentry para monitoreo de errores |
| `SENTRY_ORG` | Organización de Sentry |
| `SENTRY_PROJECT` | Proyecto de Sentry |

## Monitoreo

Rhynode usa Sentry para monitoreo de errores y performance. Configura `SENTRY_DSN` y `NEXT_PUBLIC_SENTRY_DSN` en Vercel para activarlo.

## PWA

Rhynode es una PWA con service worker, manifest, push notifications e instalación en home screen. Ver `public/manifest.json` y `public/sw.js`.

## Apps nativas

Ver `docs/native-apps-plan.md` para la estrategia de iOS/Android con Expo + WebView capuchoneada y migración progresiva a React Native.

## Deploy

```bash
vercel --prod
```

## License

Proprietary — Rhynode 2026
