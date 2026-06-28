# Rhynode Finance — App Nativa Android

## Especificación de diseño

**Fecha:** 2026-06-27  
**Estado:** Pendiente de aprobación  
**Autor:** Claude Code (sesión de brainstorming con Juan Daniel)  
**Scope:** Migrar Rhynode Finance de PWA/web + capuchón WebView a una aplicación Android nativa real (React Native / Expo), manteniendo el backend Next.js existente y reutilizando toda la lógica de negocio posible.

---

## 1. Propósito y contexto

Rhynode Finance es una plataforma de finanzas personales e inteligencia contable para Colombia y LATAM. Actualmente funciona como una aplicación web Next.js 16 con App Router, PWA y un capuchón Expo (`native/`) que solo envuelve la PWA en un `WebView`.

El objetivo de este proyecto es construir una **app Android nativa real** que:

- Reemplace al capuchón WebView actual (`native/`), que pasará a `native-legacy/` o se eliminará una vez validado el nuevo proyecto.
- Sienta y funcione como las fintech líderes de la región (Nequi, Nubank, Ualá).
- Reutilice el backend Next.js existente vía las rutas `/api/*`.
- Integre capacidades nativas: biometría, cámara + OCR, push notifications, voz, offline-first, deep links.
- Sirva como base para un futuro lanzamiento en iOS.
- Esté lista para ser promocionada por youtubers de finanzas personales.

---

## 2. Decisiones clave

| Decisión | Valor elegido | Justificación |
|----------|---------------|---------------|
| Plataforma inicial | Android | Salida más rápida; Play Store más flexible; mercado objetivo Colombia/LATAM usa masivamente Android. |
| Alcance MVP | **Todas las funciones actuales** | Incluye finanzas personales, empresariales, IA, OCR, presupuestos, metas, deudas, facturación, reportes, configuración. |
| Arquitectura | React Native real con Expo Router | No WebView como root; mejor UX, offline real, cumplimiento de stores, diferenciación visual. |
| UI / diseño | Máxima calidad premium | Objetivo: competir visualmente con fintechs top de LATAM. |
| Backend | Reutilizar Next.js existente | No duplicar API; agregar solo endpoints específicos para móvil (push token, upload de recibos). |

---

## 3. Arquitectura del repositorio

Se adopta un monorepo dentro del proyecto existente usando **npm workspaces** (incluir `"workspaces": ["apps/*", "packages/*"]` en el `package.json` raíz). Esto permite compartir el paquete `packages/shared` entre la web Next.js y la app mobile sin publicar paquetes privados.

```
rhynode-finance/
├── src/                          # Next.js web (existente)
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── ...
├── apps/mobile/                  # NUEVA app Android React Native
│   ├── app/                      # Expo Router file-based
│   │   ├── (auth)/               # login, onboarding
│   │   │   ├── sign-in.tsx
│   │   │   ├── onboarding.tsx
│   │   │   └── _layout.tsx
│   │   ├── (tabs)/               # navegación inferior principal
│   │   │   ├── index.tsx         # Inicio / Dashboard
│   │   │   ├── transactions.tsx  # Movimientos
│   │   │   ├── add.tsx           # Agregar (quick-add central)
│   │   │   ├── plan.tsx          # Presupuestos / Metas / Deudas
│   │   │   ├── more.tsx          # Facturas, clientes, advisor, ajustes
│   │   │   └── _layout.tsx
│   │   ├── dashboard/
│   │   ├── personal/
│   │   │   ├── accounts/
│   │   │   ├── budgets/
│   │   │   ├── goals/
│   │   │   ├── debts/
│   │   │   ├── recurring/
│   │   │   └── subscriptions/
│   │   ├── business/
│   │   │   ├── invoices/
│   │   │   ├── clients/
│   │   │   ├── projects/
│   │   │   └── reports/
│   │   ├── advisor/
│   │   │   └── index.tsx
│   │   ├── settings/
│   │   │   └── index.tsx
│   │   └── _layout.tsx
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/               # componentes base (Button, Card, Input, Sheet, etc.)
│   │   │   └── features/         # componentes específicos de feature
│   │   ├── screens/              # composiciones de pantallas complejas
│   │   ├── hooks/                # hooks custom
│   │   ├── lib/
│   │   │   ├── api.ts            # cliente HTTP hacia /api/*
│   │   │   ├── auth.ts           # Clerk Expo + secure storage
│   │   │   ├── storage.ts        # AsyncStorage / SecureStore wrappers
│   │   │   ├── offline-queue.ts  # engine offline-first
│   │   │   ├── i18n.ts           # i18next con es/en
│   │   │   ├── theme.ts          # tokens de diseño compartidos
│   │   │   ├── notifications.ts  # push registration y handlers
│   │   │   └── biometric.ts      # helpers de biometría
│   │   ├── types/
│   │   └── constants.ts
│   ├── assets/
│   │   ├── icon.png              # 1024x1024
│   │   ├── splash.png            # 1242x2436
│   │   ├── adaptive-icon.png
│   │   └── favicon.png
│   ├── package.json
│   ├── app.json
│   ├── eas.json
│   └── tsconfig.json
└── packages/shared/                # NUEVO paquete web + mobile
    ├── src/
    │   ├── schemas/              # Zod schemas compartidos
    │   ├── types/                # tipos TypeScript compartidos
    │   ├── finance/              # health-score, debt-strategy, goal-projection, etc.
    │   ├── format.ts             # formateo de moneda/fechas
    │   ├── currency.ts           # conversión de divisas
    │   ├── decimal.ts            # manejo seguro Decimal
    │   ├── transaction-categories.ts
    │   ├── voice-parse.ts         # parser es-CO
    │   └── i18n/                 # keys/validators compartidos
    ├── package.json
    └── tsconfig.json
```

---

## 4. Stack tecnológico

| Capa | Tecnología | Notas |
|------|------------|-------|
| Framework | Expo SDK 53, React Native 0.79, React 19 | Usar el mismo major version del capuchón existente, corrigiendo entry point y dependencias. |
| Navegación | Expo Router (file-based) | Mismo mental model de Next.js App Router; deep links automáticos. |
| Styling | NativeWind v5 + React Native Reusables | Hereda lenguaje Tailwind v4 de la web; componentes copiados y editables, no genéricos. |
| Iconos | lucide-react-native | Mismo set de iconos de la web. |
| Formularios | React Hook Form + Zod 4 + @hookform/resolvers | Reutilizar schemas del paquete compartido. |
| Animaciones | Reanimated 3 + Moti | 60 fps en UI thread; micro-interacciones premium. |
| Gráficas | victory-native-xl (Skia) | GPU-rendered; adecuado para dashboards financieros. |
| Estado servidor | TanStack Query (React Query) | Cacheo, refetch, mutations con optimistic updates. |
| Estado global | Zustand | Ligero; preferido para UI state no servidor. |
| Auth | @clerk/clerk-expo | Sesión nativa; token guardado en SecureStore. |
| Storage seguro | expo-secure-store | Tokens y secrets. |
| Storage local | expo-sqlite + @react-native-async-storage/async-storage | SQLite para datos financieros offline; AsyncStorage para preferencias. |
| Red offline | @react-native-community/netinfo | Detección de conectividad. |
| Cámara | expo-camera | Captura de recibos para OCR. |
| Push | expo-notifications + Expo Push Service | Registro de Expo Push Token en backend. |
| Biometría | expo-local-authentication | Desbloqueo y confirmación de acciones sensibles. |
| Voz | expo-speech-recognition (o API nativo de Android) + parser es-CO compartido | Quick-add por voz. |
| Testing | Jest + React Native Testing Library + Maestro | Unitarias + E2E nativo. |
| Builds | EAS Build | Android builds sin depender de máquina local. |
| Observabilidad | @sentry/react-native | Crash reporting. |

---

## 5. Integración con backend Next.js

El móvil consume el backend existente. No se crea una API paralela.

### Auth

- `@clerk/clerk-expo` maneja sign-in/sign-up.
- Tras login exitoso, se obtiene un token de sesión de Clerk.
- El token se almacena en `expo-secure-store`.
- El cliente API (`lib/api.ts`) lo inyecta en cada request a `/api/*`.
- Cierre de sesión: limpiar SecureStore, SQLite cache y tokens de push.

### Endpoints existentes reutilizados

Todos los endpoints `/api/*` actuales son válidos para el móvil. Grupos principales:

- `/api/transactions/*` — CRUD de transacciones.
- `/api/personal/*` — cuentas, presupuestos, metas, deudas, recurrentes, suscripciones.
- `/api/invoices/*`, `/api/clients/*`, `/api/projects/*` — facturación y negocio.
- `/api/ai/*` — OCR, advisor chat, categorización, anomalías, briefing.
- `/api/reports/*` — reportes fiscales.
- `/api/notifications/*` — preferencias de notificaciones.
- `/api/organization/*` — organizaciones y scope.

### Nuevos endpoints necesarios en Next.js

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/api/mobile/push-token` | POST | Registrar Expo Push Token para un usuario. |
| `/api/mobile/push-token` | DELETE | Eliminar token al cerrar sesión o desinstalar. |
| `/api/mobile/upload-receipt` | POST (multipart/form-data) | Subir imagen de recibo a storage real (Vercel Blob / Supabase Storage) y devolver URL pública. |
| `/api/mobile/health` | GET | Health check simple para el móvil. |

### Subida de archivos / OCR

El endpoint actual `/api/ai/ocr` acepta `imageUrl` con límite de 100.000 caracteres base64, insuficiente para fotos de cámara. El flujo nativo será:

1. `expo-camera` captura imagen.
2. `POST /api/mobile/upload-receipt` sube el archivo y devuelve URL pública.
3. `POST /api/ai/ocr` recibe la URL pública y devuelve datos extraídos.
4. La app pre-llena el formulario de transacción.

Storage: **Vercel Blob** como default por simplicidad y mismo ecosistema de deploy. Supabase Storage queda como alternativa documentada si surge necesidad de transformaciones de imagen o políticas de acceso más complejas.

### Push nativo

1. Al iniciar sesión, `expo-notifications` obtiene Expo Push Token.
2. Se envía a `/api/mobile/push-token`.
3. El backend almacena tokens Expo junto a las suscripciones web VAPID existentes.
4. Para enviar, el backend usa `expo-server-sdk`.

---

## 6. Navegación y estructura de pantallas

### Bottom tabs principales

| Tab | Ruta | Contenido |
|-----|------|-----------|
| Inicio | `(tabs)/index` | Dashboard: saldos, health score, gráfica, próximos pagos, accesos rápidos. |
| Movimientos | `(tabs)/transactions` | Lista de transacciones, búsqueda, filtros por fecha/categoría/cuenta. |
| Agregar | `(tabs)/add` | Botón central prominente: Gasté / Recibí / Escanear recibo / Por voz. |
| Plan | `(tabs)/plan` | Presupuestos, metas, deudas, calendario financiero. |
| Más | `(tabs)/more` | Facturas, clientes, asesor IA, configuración, perfil. |

### Flujos anidados (rutas fuera de tabs)

- `(auth)/sign-in` — pantalla de inicio de sesión con Clerk.
- `(auth)/onboarding` — flujo de bienvenida, selección de modo (personal/empresa/ambas), primera cuenta.
- `dashboard/transactions/[id]` — detalle y edición de transacción.
- `personal/accounts`, `personal/budgets`, `personal/goals`, `personal/debts`, `personal/recurring`, `personal/subscriptions`.
- `business/invoices/*`, `business/clients/*`, `business/projects/*`, `business/reports/*`.
- `advisor/index` — chat con asesor IA (streaming de mensajes).
- `settings/index` — tema, idioma, notificaciones push, biometría, membresía, soporte, cerrar sesión.

### Patrones de navegación

- Stack para flujos lineales (login → onboarding → tabs).
- Tabs para las 5 secciones principales.
- Modales nativos para agregar/editar transacciones y escanear recibos.
- Drawer opcional para menú "Más" si el contenido crece.

---

## 7. Sistema de diseño y calidad visual

### Objetivo premium

La app debe sentirse como un producto de fintech líder de LATAM: limpia, oscura, con movimiento, confiable y moderna.

### Principios

1. **Oscuro por defecto**, con posibilidad de claro. Fondo negro profundo (#0A0A0F) o slate-950.
2. **Acento dinámico**: verde esmeralda para dinero/ahorro, azul eléctrico para IA/acciones, rojo suave para alertas.
3. **Tipografía monoespaciada para dinero** (tabulares) y sans para UI.
4. **Tarjetas grandes**, bordes redondeados (`rounded-3xl`), sombras sutiles, glassmorphism moderado.
5. **Números animados**: contadores que suben/bajan suavemente al cargar datos.
6. **Feedback háptico** en acciones clave: guardar, completar meta, pagar factura.
7. **Empty states ilustrados y con CTA**, no genéricos.
8. **Loading states esqueleto**, no spinners genéricos.
9. **Consistencia con web**: mismos tokens de color, spacing, radius, iconos, copy i18n.

### Tokens compartidos

Extraer de `src/app/globals.css` a un archivo TypeScript/JSON consumido por web y mobile:

- Colores: `background`, `foreground`, `card`, `card-foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`.
- Spacing: `space-1` a `space-20`.
- Radios: `radius-sm`, `radius-md`, `radius-lg`, `radius-xl`, `radius-2xl`, `radius-3xl`.
- Tipografía: tamaños y pesos.

### Animaciones clave

- Entrada de pantallas: fade + slide up sutil.
- Transiciones de tabs: cross-fade rápido.
- Botones: escala 0.96 al presionar (MotiPressable).
- Tarjetas: elevación sutil al presionar.
- Listas: staggered entrance de items.
- Gráficas: path animation al montar.

---

## 8. Offline-first y sincronización

### Estrategia

La app debe funcionar parcialmente sin internet:

- **Lecturas:** TanStack Query cachea en `expo-sqlite` o AsyncStorage (persist query client). Los datos financieros se guardan en SQLite.
- **Escrituras:** se encolan en SQLite si no hay red.
- **Sync engine:** al recuperar conexión, se procesa la cola en orden.
- **Conflictos:** estrategia last-write-wins basada en `updatedAt`; si hay conflicto, se avisa al usuario.

### Datos offline

- Transacciones (lectura y creación).
- Cuentas, presupuestos, metas, deudas.
- Preferencias de usuario, idioma, tema.

### Datos que requieren red obligatoriamente

- Advisor IA chat.
- OCR de recibos.
- Facturación con validación DIAN en tiempo real.
- Pagos (Stripe/Wompi).
- Push token registration.

---

## 9. Capacidades nativas detalladas

### Biometría

- `expo-local-authentication` al abrir la app si el dispositivo la soporta.
- Confirmación biométrica antes de acciones sensibles: pagar factura, exportar reporte fiscal, cambiar configuraciones críticas.
- Fallback a PIN de dispositivo.

### Cámara y OCR

- Pantalla dedicada de cámara con vista previa, guía de recuadro y botón de captura.
- Flash y zoom opcionales.
- Subida a `/api/mobile/upload-receipt` y luego `/api/ai/ocr`.
- Pre-llenado del formulario de transacción con comercio, total, fecha e items.
- Confirmación del usuario antes de guardar.

### Voz

- `expo-speech` no es input; para reconocimiento de voz usar `expo-speech-recognition` o el API nativo de Android.
- Reutilizar `voice-parse.ts` del paquete compartido para parsear frases como "me gasté veinte mil en almuerzo".
- Pre-llenar tipo, monto y descripción; autofocus en monto para ajuste rápido.

### Push notifications

- `expo-notifications` para registrar token.
- Handler de notificación tocada para navegar al deep link correspondiente.
- Categorías: vencimiento de deuda, presupuesto al límite, meta completada, recordatorio de factura.

### Deep links

- Esquema `rhynode://`.
- Rutas: `rhynode://dashboard`, `rhynode://transactions`, `rhynode://transaction/[id]`, `rhynode://invoice/[id]`, `rhynode://pay/[token]`.
- Mapeo automático con Expo Router.

---

## 10. Plan de implementación por fases

### Fase 0 — Setup y fundación (semana 1)

1. Crear `apps/mobile/` y `packages/shared/`.
2. Configurar Expo SDK 53 con Expo Router, NativeWind v5, React Native Reusables.
3. Corregir entry point del capuchón existente (reemplazar `node_modules/expo/AppEntry.js`).
4. Extraer Zod schemas y tipos críticos al paquete compartido.
5. Adaptar TypeScript, ESLint y Prettier al nuevo workspace de mobile; ajustar Husky existente para incluir `apps/mobile` y `packages/shared`.
6. Crear design system base: colores, tipografía, botones, inputs, cards, sheets.
7. Configurar i18next con `messages/es.json` y `messages/en.json`.

### Fase 1 — Auth y navegación (semana 1-2)

1. Integrar `@clerk/clerk-expo`.
2. Pantalla de sign-in.
3. Onboarding: selección de modo y primera cuenta.
4. Bottom tabs + navegación entre secciones.
5. Deep links básicos.
6. Biometría al abrir.

### Fase 2 — Dashboard y transacciones (semana 2-3)

1. Dashboard home con saldos, health score, próximos pagos.
2. Gráfica rápida con victory-native-xl.
3. Lista de transacciones con búsqueda y filtros.
4. Detalle de transacción.
5. Quick-add transacción: formulario nativo, selector de cuenta y categoría.
6. Integrar voz para quick-add.

### Fase 3 — Finanzas personales (semana 4-5)

1. Cuentas: lista, saldos, detalle.
2. Presupuestos: lista, progreso, alertas.
3. Metas de ahorro.
4. Deudas (OWE / OWED).
5. Recurrentes y suscripciones.
6. Calendario financiero.

### Fase 4 — Empresa e IA (semana 6-7)

1. Facturación: lista, creación, estados, detalle.
2. Clientes y proyectos.
3. Reportes fiscales pre-llenados con export/share nativo.
4. Asesor IA: chat nativo con streaming SSE.
5. OCR de recibos con cámara nativa.

### Fase 5 — Premium y nativo avanzado (semana 8)

1. Push notifications completas (registro, handlers, categorías).
2. Offline sync engine.
3. Animaciones finales y micro-interacciones.
4. Empty states premium.
5. Haptic feedback en flujos clave.
6. Tests unitarios y E2E con Maestro.
7. Sentry React Native.

### Fase 6 — Play Store (semana 9)

1. Generar assets finales (icono, splash, screenshots para Play Store).
2. Configurar `eas.json` (development, preview, production).
3. EAS Build para Android (AAB).
4. Play Console: data safety form, privacy policy, contenido para niños.
5. Beta cerrada con testers.
6. Lanzamiento progresivo en producción.

---

## 11. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Clerk Next.js y Clerk Expo tienen diferencias de sesión | Media | Alto | Usar tokens explícitos, no depender de cookies; probar OAuth + deep link callback exhaustivamente. |
| next-intl no corre en RN | Alta | Medio | Migrar a i18next reutilizando los JSON existentes de `messages/`. |
| Tailwind v4 tokens no se alinean perfecto con NativeWind | Media | Medio | Definir tokens base en TS/JSON compartido; NativeWind consume clases, no genera tokens. |
| Rendimiento en Android gama media | Media | Alto | Usar Reanimated, Skia charts, listas virtualizadas, evitar re-renders, probar en dispositivo real. |
| Offline sync introduce bugs de datos | Media | Alto | Empezar con lectura offline; escritura offline en fase 5 con tests específicos. |
| Tamaño de bundle excesivo | Media | Medio | EAS Build + Hermes + ProGuard; auditar bundle periódicamente. |
| Play Store rechazo por parecer web | Baja | Alto | No usar WebView como root; todas las pantallas principales nativas. |
| Subida de imágenes requiere storage nuevo | Alta | Medio | Crear `/api/mobile/upload-receipt` usando Vercel Blob o Supabase Storage. |
| Scope doble (personal/empresa) complica navegación | Media | Medio | Mantener selector de scope persistente en top bar, igual que web. |

---

## 12. Criterios de éxito

- App publicada en Google Play Store.
- 0 WebView en el flujo principal (excepto webviews opcionales para términos/privacidad si aplica).
- Todas las funciones principales de la web disponibles en móvil.
- Build estable con tests pasando.
- Tiempo de inicio < 3 segundos en Android gama media.
- Animaciones a 60 fps.
- Offline funcional para lectura y creación de transacciones.

---

## 13. Próximos pasos tras aprobación

1. Invocar `superpowers:writing-plans` para generar el plan de implementación detallado con tareas concretas, dependencias y estimaciones.
2. Ejecutar la Fase 0 (setup del proyecto móvil).
3. Lanzar agentes en paralelo para acelerar la implementación siguiendo las reglas de subagent-driven-development.

---

## Aprobación

**Estado:** Pendiente de revisión por Juan Daniel.

Por favor revisa este documento y confirma si estás de acuerdo o si quieres ajustar alcance, stack, fases o prioridades antes de pasar al plan de implementación.
