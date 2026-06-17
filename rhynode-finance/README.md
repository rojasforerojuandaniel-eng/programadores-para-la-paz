# Rhynode Finance

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen)
![Deploy](https://img.shields.io/badge/deploy-Vercel-black?logo=vercel)

**Finanzas personales e inteligencia contable para Colombia.**

Rhynode Finance une finanzas personales y operaciones de negocio en una sola plataforma moderna y segura. Controla tu dinero, ahorra con inteligencia, factura electrónicamente, cumple con tus obligaciones tributarias y recibe consejos de un asesor financiero impulsado por IA.

---

## Posicionamiento

- **B2C**: app de finanzas personales con presupuestos, metas, seguimiento de gastos, suscripciones, deudas, inversiones y patrimonio neto.
- **B2B**: facturación electrónica DIAN-ready, clientes, proyectos, cuentas por cobrar, impuestos y reportes fiscales para pymes.
- **Funnel**: los usuarios personales descubren las herramientas de negocio y pueden activar el modo Empresa / Ambas cuando crecen.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Components, Turbopack) |
| UI | [React 19](https://react.dev), [Tailwind CSS 4](https://tailwindcss.com), [Radix UI](https://radix-ui.com) |
| Lenguaje | [TypeScript 5](https://www.typescriptlang.org) (strict mode) |
| ORM / DB | [Prisma 7](https://prisma.io) + [Neon Postgres](https://neon.tech) |
| Auth | [Clerk](https://clerk.com) |
| Pagos | [Stripe](https://stripe.com) (suscripciones + payment links), [Wompi](https://wompi.co) (pagos locales Colombia) |
| IA | [Anthropic Claude](https://anthropic.com) (asesor financiero, OCR, anomalías, briefing) |
| Cache / Rate limit | [Upstash Redis](https://upstash.com) (opcional, fallback a memoria) |
| Observabilidad | [Sentry](https://sentry.io), [Vercel Analytics](https://vercel.com/analytics), [Vercel Speed Insights](https://vercel.com/speed-insights) |
| Testing | [Vitest](https://vitest.dev) + [Playwright](https://playwright.dev) |

---

## Features principales

### Finanzas personales (B2C)

- **Dashboard unificado**: widgets adaptativos según el modo Personal / Empresa / Ambas.
- **Transacciones**: CRUD completo, filtros, búsqueda, auto-categorización con keywords colombianos.
- **Presupuestos**: límites mensuales por categoría, progreso visual y alertas configurables.
- **Metas de ahorro**: monto objetivo, deadline y progreso.
- **Deudas**: tipo OWE / OWED, interés y fecha límite.
- **Recurrentes y suscripciones**: 6 frecuencias y detección automática de suscripciones con subidas de precio.
- **Cuentas bancarias**: 6 tipos (cheque, ahorros, efectivo, tarjeta de crédito, inversión, préstamo).
- **Calendario financiero**: eventos de deudas, recurrentes, metas y presupuestos agrupados por semana.
- **Inversiones y patrimonio neto**: 6 tipos de activos, snapshots automáticos y evolución del patrimonio.
- **Simulador "qué pasa si"**: escenarios de ahorro, gasto o inversión.
- **Predicciones**: proyección de flujo de caja a 3 meses con regresión lineal.

### Finanzas empresariales (B2B)

- **Facturación electrónica**: numeración automática `INV-{YYYY}-{secuencia}`, IVA 19% default, estados DRAFT / SENT / PAID / OVERDUE.
- **Clientes y proyectos**: historial de facturas, presupuesto y estado por proyecto.
- **Cuentas por cobrar**: recordatorios automáticos de vencimientos.
- **Impuestos colombianos**: calculadora de IVA, ReteFuente por brackets e ICA por ciudad.
- **Reportes fiscales pre-llenados**: exportación a Excel / PDF.
- **Multi-moneda**: COP, MXN, BRL, ARS, CLP, PEN, USD.
- **Links de cobro**: Stripe + Wompi.

### Inteligencia artificial

- **AI Advisor chat**: asesor financiero con contexto real de tus datos y streaming SSE.
- **OCR de recibos**: extracción de comercio, total, fecha e items con confidence score.
- **Gastos hormiga**: 6 patrones colombianos detectados automáticamente.
- **Detección de anomalías**: comparación del mes actual vs promedio de los 2 meses anteriores.
- **Briefing diario**: resumen financiero diario generado con Anthropic y cache 24h.
- **Health Score v2**: puntaje 0-100 basado en ahorro, deuda, presupuestos, metas y diversificación.

### PWA y experiencia móvil

- Service worker, `manifest.json`, instalación en home screen.
- Push notifications via VAPID.
- Página offline y shortcuts a resumen, transacciones y facturas.
- Responsive mobile-first.

### Gamificación

- Sistema XP con 9 acciones, 100 niveles y títulos colombianos.
- Rachas con bonificación en 7 y 30 días.
- 15 logros en 3 categorías.
- Leaderboards y presupuestos compartidos con invite codes.

---

## Requisitos previos

- [Node.js 20](https://nodejs.org) (ver `.nvmrc`; se recomienda usar [nvm](https://github.com/nvm-sh/nvm))
- [npm](https://www.npmjs.com) >= 10
- Cuenta en [Vercel](https://vercel.com) para deploy
- Cuentas/configuración opcional: Clerk, Stripe, Wompi, Neon, Sentry, Upstash

---

## Setup local paso a paso

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd rhynode-finance

# 2. Usar la versión de Node correcta
nvm use

# 3. Instalar dependencias
npm install

# 4. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus secrets.

# 5. Generar el cliente de Prisma
npx prisma generate

# 6. (Opcional) Sincronizar el schema con la base de datos
npm run db:push

# 7. Levantar el servidor de desarrollo
npm run dev
```

La app estará disponible en [http://localhost:3000](http://localhost:3000).

> **Tip**: si el proyecto ya está vinculado a Vercel, puedes usar `vercel env pull .env.local --yes` para descargar las variables de entorno del dashboard. Recuerda re-generar Prisma después de cambiar la base de datos.

---

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo con Turbopack |
| `npm run build` | Build de producción |
| `npm start` | Servidor de producción (requiere build previo) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generar el cliente de Prisma |
| `npm run db:push` | Push del schema a la base de datos (desarrollo) |
| `npm run db:migrate` | Crear y aplicar migraciones con Prisma Migrate |
| `npm run db:seed` | Ejecutar seed de datos iniciales |
| `npm run db:studio` | Abrir Prisma Studio |
| `npm test` | Ejecutar tests unitarios con Vitest |
| `npm run test:watch` | Tests unitarios en modo watch |
| `npm run test:e2e` | Ejecutar tests E2E con Playwright |
| `npm run test:e2e:ui` | Ejecutar tests E2E con UI de Playwright |

---

## Estructura de carpetas

```
rhynode-finance/
├── prisma/                 # Schema Prisma, migraciones y seed
├── public/                 # Static assets, manifest PWA, service worker
├── e2e/                    # Tests E2E con Playwright
├── scripts/                # Scripts auxiliares
├── docs/                   # Documentación adicional (apps nativas, planificación)
├── src/
│   ├── app/                # Rutas de Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── dashboard/      # Dashboard y módulos de la app
│   │   ├── onboarding/     # Flujo de onboarding
│   │   ├── sign-in/        # Pantalla de inicio de sesión (Clerk)
│   │   ├── sign-up/        # Pantalla de registro (Clerk)
│   │   └── ...
│   ├── components/
│   │   ├── ui/             # Componentes base (shadcn/ui style)
│   │   ├── landing/        # Secciones de la landing page
│   │   ├── dashboard/      # Widgets y vistas del dashboard
│   │   ├── auth/           # Componentes de autenticación
│   │   └── pwa/            # Componentes de la PWA
│   ├── lib/                # Utilidades, helpers, lógica de negocio y clientes
│   ├── hooks/              # Custom React hooks
│   ├── generated/          # Código generado (Prisma client, etc.)
│   └── types/              # Tipos TypeScript globales
├── .env.example            # Plantilla de variables de entorno
├── middleware.ts           # Middleware de autenticación y scope
├── next.config.ts          # Configuración de Next.js + headers de seguridad
├── package.json
└── README.md
```

---

## Variables de entorno críticas

Copia `.env.example` a `.env.local` y completa al menos las siguientes variables.

### Obligatorias para desarrollo local

| Variable | Propósito |
|----------|-----------|
| `DATABASE_URL` | Connection string de Neon Postgres |
| `CLERK_SECRET_KEY` | Clerk server key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | URL de sign-in (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | URL de sign-up (`/sign-up`) |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (ej. `http://localhost:3000`) |

### Obligatorias para pagos y producción

| Variable | Propósito |
|----------|-----------|
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_STARTER_PRICE_ID` | Stripe price ID plan Starter |
| `STRIPE_GROWTH_PRICE_ID` | Stripe price ID plan Growth |
| `STRIPE_SCALE_PRICE_ID` | Stripe price ID plan Scale |
| `WOMPI_PUBLIC_KEY` | Wompi public key (Colombia) |
| `WOMPI_PRIVATE_KEY` | Wompi private key |

### Inteligencia artificial

| Variable | Propósito |
|----------|-----------|
| `ANTHROPIC_API_KEY` | API key de Anthropic para el AI Advisor |

### PWA, cron y webhooks

| Variable | Propósito |
|----------|-----------|
| `CRON_SECRET` | Secret para proteger endpoints de cron |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID para push notifications |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID |

### Observabilidad y cache (opcionales)

| Variable | Propósito |
|----------|-----------|
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | DSN de Sentry para monitoreo de errores |
| `SENTRY_ORG` | Organización de Sentry |
| `SENTRY_PROJECT` | Proyecto de Sentry |
| `UPSTASH_REDIS_REST_URL` | URL de Upstash Redis para rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Token de Upstash Redis |

> **Reglas de seguridad**:
> - Nunca pongas secrets en variables con prefijo `NEXT_PUBLIC_`; esas van al bundle del navegador.
> - No commitees `.env.local` ni `.env.*.local`; ya están en `.gitignore`.
> - En producción usa el dashboard de Vercel o `vercel env add` para gestionar secrets.

---

## Deploy a Vercel

### Opción 1: Git integration (recomendada)

1. Conecta el repositorio en el [dashboard de Vercel](https://vercel.com).
2. Configura las variables de entorno en **Project Settings > Environment Variables**.
3. Cada push a `main` desencadena un deploy de producción automático.

### Opción 2: CLI

```bash
# Vincular el proyecto
vercel link --yes --project rhynode-finance

# Deploy de preview
vercel

# Deploy a producción
vercel --prod
```

### Después del deploy

1. Configura los webhooks de Stripe y Wompi apuntando a `/api/webhooks/stripe` y `/api/webhooks/wompi`.
2. Verifica que las variables de entorno de producción estén pobladas.
3. Comprueba el health check en `/api/health`.

---

## Contribución

¡Gracias por querer mejorar Rhynode Finance! Consulta [CONTRIBUTING.md](./CONTRIBUTING.md) para las convenciones completas. Resumen rápido:

- TypeScript strict mode. No uses `any` ni `// @ts-ignore`.
- Usa Server Components por defecto; marca `"use client"` solo cuando sea necesario.
- Valida inputs de API con Zod.
- Usa Tailwind CSS para estilos; evita estilos inline.
- Componentes < 500 líneas y funciones < 30 líneas.
- No dejes `console.log`; usa `logger` en `src/lib/logger.ts`.
- Antes de abrir un PR asegúrate de que `npx tsc --noEmit`, `npm run lint` y `npm test` pasen.

---

## Licencia

Proprietary — Rhynode 2026. Todos los derechos reservados.
