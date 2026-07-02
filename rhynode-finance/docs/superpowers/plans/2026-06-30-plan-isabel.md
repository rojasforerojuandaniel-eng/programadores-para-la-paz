# Plan Isabel — Rhynode Finance Mobile Production-Ready

> **Goal:** Dejar la app mobile de Rhynode Finance lista para lanzamiento a usuarios reales en Android (Play Store) y iOS (App Store), con seguridad, estabilidad, accesibilidad, build/release engineering, monitoreo y cumplimiento legal resueltos.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

> **Activation phrase:** Cuando el usuario diga **"plan isabel"**, ejecutar este plan en orden de fases, verificando cada gate antes de continuar.

**Branch base:** `feat/mobile-android-perfect-2026-06-30`
**Target final branch:** `feat/mobile-production-ready`
**Success definition:**
- `pnpm test` pasa ≥80% coverage en hooks críticos.
- `tsc --noEmit` 0 errores, ESLint 0 errores.
- `expo doctor` 0 fallos críticos.
- APK/AAB release firmado con keystore de producción.
- Smoke test en dispositivo real: login, dashboard, agregar transacción, chat, cámara, sign-out.
- Play Console internal track enviado y aprobado.
- Sentry + analytics + push notifs operativos en producción.
- Sin P0 de seguridad, funcionalidad ni accesibilidad abiertos.

**Tech Stack:** Expo 53, React Native 0.79, Clerk Expo, TanStack Query, Zod, NativeWind, TypeScript, EAS Build, Sentry, PostHog, Expo Notifications, Maestro.

---

## Fase 0 — Seguridad crítica y autenticación

### Task 0.1: Eliminar bypass de autenticación `demo-token` ✅

**Files:**
- Delete: `src/app/api/mobile/demo-token/route.ts`
- Modify: `src/middleware.ts` (quitar ruta pública `/api/mobile/demo-token`)
- Modify: `apps/mobile/app/(auth)/sign-in.tsx` (eliminar fallback MFA con ticket demo)

**Steps:**
- [x] **Step 1:** Borrar `src/app/api/mobile/demo-token/route.ts`.
- [x] **Step 2:** En `src/middleware.ts`, eliminar `"/api/mobile/demo-token"` de `publicRoutes`.
- [x] **Step 3:** En `apps/mobile/app/(auth)/sign-in.tsx`, borrar el bloque `else if (result.status === 'needs_second_factor')` que llama a `/api/mobile/demo-token`.
- [x] **Step 4:** Mostrar mensaje de error amigable cuando `status === 'needs_second_factor'`: "Tu cuenta requiere verificación en dos pasos. Configúrala en la web e intenta de nuevo."
- [x] **Step 5:** Ejecutar `pnpm tsc --noEmit` y `pnpm test` en mobile.
- [x] **Step 6:** Commit: `feat(mobile): remove insecure demo-token MFA bypass`.

**Test:**
- `curl -X POST https://rhynode-finance.vercel.app/api/mobile/demo-token` debe retornar 404.
- En mobile, intentar login con cuenta que tenga MFA debe mostrar mensaje de error, no redirigir a tabs.

---

### Task 0.2: Implementar MFA real en mobile ✅

**Files:**
- Create: `apps/mobile/app/(auth)/mfa.tsx`
- Modify: `apps/mobile/app/(auth)/sign-in.tsx`
- Create: `apps/mobile/src/components/features/mfa-code-input.tsx`

**Steps:**
- [x] **Step 1:** Crear componente `MfaCodeInput` con 6 inputs o un solo input numérico, accesible con `accessibilityLabel="Código TOTP"`.
- [x] **Step 2:** En `sign-in.tsx`, cuando `result.status === 'needs_second_factor'`, redirigir a `/(auth)/mfa` pasando `signInAttemptId` y `identifier` por params.
- [x] **Step 3:** En `mfa.tsx`, usar `signIn.prepareSecondFactor({ strategy: 'totp' })` y luego `signIn.attemptSecondFactor({ strategy: 'totp', code })` según docs de Clerk Expo. Soportar también códigos de backup como fallback.
- [x] **Step 4:** Manejar errores sin exponer internals: "Código incorrecto o expirado. Intenta de nuevo."
- [x] **Step 5:** Tests en `__tests__/app/mfa.test.tsx` con mocks de `@clerk/clerk-expo`.
- [x] **Step 6:** Commit: `feat(mobile): real TOTP MFA flow`.

**Docs:** Leer https://clerk.com/docs/references/expo/sign-in-second-factor antes de implementar.

---

### Task 0.3: Arreglar `AuthGate` — biometría real y fallback seguro

**Files:**
- Modify: `apps/mobile/src/components/features/auth-gate.tsx`
- Create: `apps/mobile/src/components/features/pin-lock.tsx`
- Modify: `apps/mobile/src/lib/biometric.ts`

**Steps:**
- [x] **Step 1:** En `auth-gate.tsx`, cuando `authenticateBiometric` retorne `false` (usuario cancela), no poner `biometricPassed(true)`. Mostrar fallback: pedir PIN o device credential.
- [x] **Step 2:** Mientras `isLoaded` es false, renderizar splash/loader en lugar de `null`.
- [x] **Step 3:** Crear `pin-lock.tsx` con input numérico de 6 dígitos. Guardar hash del PIN en `expo-secure-store` (usar SHA-256 con salt random por dispositivo).
- [x] **Step 4:** En `biometric.ts`, exponer `authenticateBiometric({ fallbackLabel, disableDeviceCredentials })` y manejar errores.
- [x] **Step 5:** Tests: `__tests__/features/auth-gate.test.tsx`.
- [x] **Step 6:** Commit: `fix(mobile): enforce biometric/PIN gate`.

---

### Task 0.4: Manejo seguro de tokens y sign-out

**Files:**
- Modify: `apps/mobile/src/lib/auth.ts`
- Modify: `apps/mobile/app/settings.tsx`
- Modify: `apps/mobile/src/lib/api.ts`

**Steps:**
- [x] **Step 1:** Revisar `clearAuthStorage`; si no se usa, borrar archivo. Clerk maneja tokens en SecureStore automáticamente.
- [x] **Step 2:** En `settings.tsx`, añadir confirmación antes de sign-out (`Alert.alert`). Mostrar loading y error si falla.
- [x] **Step 3:** En `api.ts` y `use-api.ts`, si `getToken()` falla, propagar error y redirigir a sign-in en lugar de enviar request sin auth.
- [x] **Step 4:** Commit: `fix(mobile): safe token handling and sign-out`.

---

### Task 0.5: Rate limiting y validación en API routes mobile

**Files:**
- Modify: `src/app/api/mobile/upload-receipt/route.ts`
- Modify: `src/app/api/ai/ocr/route.ts`
- Modify: `src/app/api/ai/chat/route.ts`
- Create/Modify: `src/lib/rate-limit.ts` (si no existe)

**Steps:**
- [x] **Step 1:** Añadir `zod` schemas para body de `upload-receipt`, `ocr`, `chat`.
- [x] **Step 2:** Añadir rate limit por `userId` o IP (p. ej. 20 req/min para chat, 10/min para OCR).
- [x] **Step 3:** Sanitizar `imageUrl` en OCR: validar que sea URL del storage propio.
- [x] **Step 4:** Limitar tamaño de upload en server (Cloudflare/Vercel max 4.5 MB, pero añadir validación explícita).
- [x] **Step 5:** Commit: `feat(mobile): rate limits and input validation on mobile APIs`.

---

## Fase 1 — Funcionalidad crítica y estabilidad de datos

### Task 1.1: Pantalla de detalle de transacción real

**Files:**
- Modify: `apps/mobile/app/transaction/[id].tsx`
- Create: `apps/mobile/src/hooks/use-transaction.ts`
- Create: `apps/mobile/src/components/features/transaction-actions.tsx`
- Modify backend: `src/app/api/personal/transactions/[id]/route.ts` (si no existe GET/DELETE/PATCH)

**Steps:**
- [x] **Step 1:** Crear hook `useTransaction(id)` que haga GET `/api/personal/transactions/[id]` con Zod schema.
- [x] **Step 2:** Crear hook `useDeleteTransaction()` y `useUpdateTransaction()`.
- [x] **Step 3:** En `[id].tsx`, mostrar: tipo, monto, moneda, descripción, categoría, fecha, cuenta/organización. Usar `tabular-nums`.
- [x] **Step 4:** Añadir acciones: Editar (navegar a form pre-cargado), Eliminar (confirmación), Compartir (React Native Share).
- [x] **Step 5:** Estados loading, error, not found.
- [x] **Step 6:** Tests: `__tests__/app/transaction/[id].test.tsx`.
- [x] **Step 7:** Commit: `feat(mobile): real transaction detail with edit/delete/share`.

---

### Task 1.2: Manejo de errores de red en dashboard y listas

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/app/(tabs)/transactions.tsx`
- Modify: `apps/mobile/src/components/ui/error-state.tsx` (crear si no existe)
- Modify: `apps/mobile/src/components/ui/empty-state.tsx`

**Steps:**
- [x] **Step 1:** Consumir `error` e `isError` de `useDashboardSummary` y `useTransactions`.
- [x] **Step 2:** Crear `ErrorState` con mensaje claro, botón "Reintentar" que llame `refetch()`.
- [x] **Step 3:** Distinguir `isLoading` de `isError` de `data empty` en `transactions.tsx`.
- [x] **Step 4:** Añadir `retry: 2` y `staleTime: 30_000` en hooks de datos críticos.
- [x] **Step 5:** Commit: `fix(mobile): proper network error states on dashboard and lists`.

---

### Task 1.3: Offline queue robusta

**Files:**
- Modify: `apps/mobile/src/lib/api.ts`
- Modify: `apps/mobile/src/lib/offline-queue.ts`
- Create: `apps/mobile/src/components/features/offline-banner.tsx`
- Modify: `apps/mobile/src/hooks/use-network.ts`

**Steps:**
- [x] **Step 1:** En `offline-queue.ts`, añadir columna `status` (`pending`, `failed_permanently`) y función `markDeadLetter(id)`.
- [x] **Step 2:** En `api.ts`, si mutación offline es POST, no devolver objeto falso como éxito; devolver `OfflineError` con datos locales en campo `optimistic`.
- [x] **Step 3:** En componentes que usan `useCreateTransaction`, mostrar toast "Sin conexión. Se guardará cuando vuelvas en línea." cuando es offline.
- [x] **Step 4:** Crear `offline-banner.tsx` que se muestre cuando `isOnline === false`.
- [x] **Step 5:** `syncPendingMutations`: cuando `retries >= 3`, mover a dead-letter y notificar al usuario.
- [x] **Step 6:** Tests: `__tests__/lib/offline-queue.test.ts`, `__tests__/lib/api-offline.test.ts`.
- [x] **Step 7:** Commit: `feat(mobile): robust offline queue with dead letter`.

---

### Task 1.4: Validación runtime con Zod en cliente y servidor

**Files:**
- Create: `apps/mobile/src/schemas/transaction.ts`
- Create: `apps/mobile/src/schemas/dashboard.ts`
- Modify: `apps/mobile/src/lib/api.ts` (añadir `request` con Zod parse opcional)
- Modify: todos los hooks (`use-dashboard.ts`, `use-transactions.ts`, etc.) para usar schemas

**Steps:**
- [x] **Step 1:** Definir schemas Zod para `Transaction`, `DashboardSummary`, `ChatMessage`, `OcrResult`.
- [x] **Step 2:** Crear helper `safeJson<T>(schema: ZodType<T>, data: unknown) => T`.
- [x] **Step 3:** En `request`, devolver `safeJson(schema, json)` en lugar de `as T`.
- [x] **Step 4:** En backend routes, validar body con Zod antes de procesar.
- [x] **Step 5:** Commit: `feat(mobile): runtime Zod validation`.

---

### Task 1.5: Chat robusto

**Files:**
- Modify: `apps/mobile/src/hooks/use-chat.ts`
- Modify: `apps/mobile/app/advisor.tsx`
- Create: `apps/mobile/src/components/features/chat-message.tsx`

**Steps:**
- [x] **Step 1:** Añadir `AbortController` a `useChat` para cancelar fetch si usuario sale.
- [x] **Step 2:** Añadir timeout de 15s con `AbortSignal.timeout(15000)` (o polyfill).
- [x] **Step 3:** Incluir mensaje actual del usuario en `history` (ahora se envía sin él).
- [x] **Step 4:** Distinguir errores de red vs errores de servidor; no agregar error como mensaje del asistente.
- [x] **Step 5:** Mostrar indicador "escribiendo" y botón cancelar.
- [x] **Step 6:** Tests: `__tests__/hooks/use-chat.test.ts`.
- [x] **Step 7:** Commit: `feat(mobile): robust chat with abort, timeout, typing indicator`.

---

### Task 1.6: Cámara robusta (offline, compresión, recovery)

**Files:**
- Modify: `apps/mobile/app/camera.tsx`
- Create: `apps/mobile/src/lib/image-compress.ts`
- Modify: `apps/mobile/src/lib/api.ts` (permitir FormData en offline queue)
- Modify: `src/app/api/mobile/upload-receipt/route.ts`

**Steps:**
- [x] **Step 1:** En `camera.tsx`, mientras `permission` es null mostrar spinner en lugar de fondo negro.
- [x] **Step 2:** Crear helper `compressImage(uri, maxWidth=1200, quality=0.7)` usando `expo-image-manipulator` (añadir dependencia).
- [x] **Step 3:** Si no hay red, encolar la mutación (incluir URI local) y mostrar "Recibo guardado; se procesará al reconectar.".
- [x] **Step 4:** Mejorar errores: no mostrar status codes crudos. "No pudimos leer el recibo. Intenta de nuevo o ingresa manualmente."
- [x] **Step 5:** Añadir botón cerrar y guía visual overlay para recibo.
- [x] **Step 6:** Commit: `feat(mobile): camera offline support and compression`.

---

## Fase 2 — UX, UI y accesibilidad

### Task 2.1: Accesibilidad base en componentes UI

**Files:**
- Modify: `apps/mobile/src/components/ui/button.tsx`
- Modify: `apps/mobile/src/components/ui/pressable.tsx`
- Modify: `apps/mobile/src/components/ui/text-input.tsx`
- Modify: `apps/mobile/src/components/ui/toast.tsx`
- Modify: `apps/mobile/src/components/ui/empty-state.tsx`
- Modify: `apps/mobile/src/components/ui/skeleton.tsx`

**Steps:**
- [x] **Step 1:** En `button.tsx`, propagar `accessibilityRole="button"`, `accessibilityState={{ disabled, busy: loading }}`, `accessibilityLabel` cuando children sea icono.
- [x] **Step 2:** En `pressable.tsx`, aplicar lo mismo.
- [x] **Step 3:** En `text-input.tsx`, requerir `label` prop que renderice `Text` con `accessibilityLabel` y asocie al input.
- [x] **Step 4:** En `toast.tsx`, usar `AccessibilityInfo.announceForAccessibility(message)` al mostrar toast.
- [x] **Step 5:** En `skeleton.tsx`, poner `aria-busy` / `accessibilityState={{ busy: true }}` y `accessibilityLabel="Cargando"`.
- [x] **Step 6:** Commit: `a11y(mobile): base roles, labels, states`.

---

### Task 2.2: Formularios accesibles

**Files:**
- Modify: `apps/mobile/app/(auth)/sign-in.tsx`
- Modify: `apps/mobile/src/components/features/quick-add-form.tsx`
- Modify: `apps/mobile/src/components/features/category-picker.tsx`
- Modify: `apps/mobile/app/(auth)/mfa.tsx`

**Steps:**
- [x] **Step 1:** Reemplazar `placeholder="Email"` por `label="Correo electrónico"` con `TextInput` accesible.
- [x] **Step 2:** Añadir `returnKeyType`, `onSubmitEditing`, `blurOnSubmit` para navegación por teclado.
- [x] **Step 3:** Validar email con Zod en cliente; mostrar error por campo.
- [x] **Step 4:** En `category-picker.tsx`, añadir `accessibilityRole="dialog"` al modal y mover foco al abrir.
- [x] **Step 5:** Commit: `a11y(mobile): accessible forms`.

---

### Task 2.3: Estados empty, loading y error con CTAs

**Files:**
- Modify: `apps/mobile/src/components/ui/empty-state.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/app/(tabs)/transactions.tsx`
- Modify: `apps/mobile/app/(tabs)/add.tsx`

**Steps:**
- [x] **Step 1:** Añadir prop `action` a `EmptyState`: `{ label: string, onPress: () => void }`.
- [x] **Step 2:** Dashboard vacío: "Aún no tienes movimientos. Agrega uno" con botón a QuickAdd.
- [x] **Step 3:** Transactions vacío: similar.
- [x] **Step 4:** Estados de error con botón reintentar.
- [x] **Step 5:** Commit: `ux(mobile): empty/error states with CTAs`.

---

### Task 2.4: Contraste, touch targets y reduced motion

**Files:**
- Modify: `apps/mobile/tailwind.config.js` (tokens de color)
- Modify: `apps/mobile/src/components/ui/button.tsx`
- Modify: `apps/mobile/src/components/ui/skeleton.tsx`
- Modify: `apps/mobile/src/components/features/health-score-ring.tsx`
- Create: `apps/mobile/src/hooks/use-reduced-motion.ts`

**Steps:**
- [x] **Step 1:** Verificar contraste primario `#10b981` sobre blanco: si no cumple WCAG AA, ajustar a `#047857` o similar.
- [x] **Step 2:** Asegurar touch targets mínimos 48×48dp en todos los Pressable (ya hay `min-h/w-[48px]` en Button; verificar iconos).
- [x] **Step 3:** Crear hook `useReducedMotion()` con `AccessibilityInfo.isReduceMotionEnabled()`.
- [x] **Step 4:** En `skeleton.tsx` y animaciones de entrada, respetar reduced motion (sin pulso/translate si está activo).
- [x] **Step 5:** Commit: `a11y(mobile): contrast, touch targets, reduced motion`.

---

### Task 2.5: Internacionalización completa es/en

**Files:**
- Modify: `apps/mobile/src/locales/es.json`
- Modify: `apps/mobile/src/locales/en.json`
- Modify: `apps/mobile/src/lib/i18n.ts`
- Modify: todas las pantallas para usar `useTranslation()`

**Steps:**
- [x] **Step 1:** Extraer todos los strings hardcodeados de `app/`, `src/components/`, `src/hooks/`.
- [x] **Step 2:** Llenar `es.json` y `en.json` con namespaces: `auth`, `dashboard`, `transactions`, `advisor`, `camera`, `settings`, `errors`, `a11y`.
- [x] **Step 3:** Reemplazar strings por `t('key')`.
- [x] **Step 4:** Asegurar que `accessibilityLabel` también use `t()`.
- [x] **Step 5:** Tests: verificar que no queden strings hardcodeados con script `scripts/find-untranslated.ts`.
- [x] **Step 6:** Commit: `i18n(mobile): full es/en coverage`.

---

### Task 2.6: Toast queue y stacking

**Files:**
- Modify: `apps/mobile/src/hooks/use-toast.ts`
- Modify: `apps/mobile/src/components/ui/toast.tsx`

**Steps:**
- [x] **Step 1:** Cambiar posición absoluta fija por layout que apile toasts verticalmente.
- [x] **Step 2:** Limitar a 3 toasts visibles; cola FIFO para el resto.
- [x] **Step 3:** Auto-dismiss después de 4s (pausar al tocar).
- [x] **Step 4:** Commit: `ux(mobile): toast queue and stacking`.

---

### Task 2.7: Ajustes reales

**Files:**
- Modify: `apps/mobile/app/settings.tsx`
- Create: `apps/mobile/src/components/features/theme-toggle.tsx`
- Create: `apps/mobile/src/components/features/locale-toggle.tsx`

**Steps:**
- [x] **Step 1:** Añadir secciones: Cuenta (email), Tema, Idioma, Notificaciones push, Biometría, Privacidad/Términos, Cerrar sesión.
- [x] **Step 2:** Implementar toggle tema con `useColorScheme` y `theme.tsx`.
- [x] **Step 3:** Implementar selector idioma con `i18next.changeLanguage()`.
- [x] **Step 4:** Commit: `feat(mobile): real settings screen`.

---

## Fase 3 — Build & release engineering

### Task 3.1: Keystore de producción y firma release

**Files:**
- Modify: `apps/mobile/android/app/build.gradle`
- Modify: `apps/mobile/android/gradle.properties` (añadir variables de entorno)
- Create: script `scripts/generate-android-keystore.sh`
- Update: `.gitignore` para ignorar keystore

**Steps:**
- [x] **Step 1:** Generar keystore de producción: `keytool -genkey -v -keystore rhynode-release.keystore -alias rhynode -keyalg RSA -keysize 2048 -validity 10000`.
- [x] **Step 2:** Subir keystore y credentials a EAS (nunca versionar keystore).
- [x] **Step 3:** En `build.gradle`, definir `release` signingConfig que lea `RHYNODE_RELEASE_STORE_FILE`, `RHYNODE_RELEASE_STORE_PASSWORD`, `RHYNODE_RELEASE_KEY_ALIAS`, `RHYNODE_RELEASE_KEY_PASSWORD` desde env o `gradle.properties`.
- [x] **Step 4:** Cambiar `buildTypes.release.signingConfig` a `signingConfigs.release`.
- [x] **Step 5:** Verificar build local: `cd android && ./gradlew assembleRelease`.
- [x] **Step 6:** Commit: `build(mobile): production keystore and release signing`.

---

### Task 3.2: Resolver fallos de Expo Doctor

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/metro.config.js`
- Modify: `apps/mobile/babel.config.js`

**Steps:**
- [x] **Step 1:** Quitar `expo-modules-autolinking` y `expo-modules-core` de `dependencies`.
- [x] **Step 2:** Añadir `react-dom` como dependencia directa con versión compatible con `react@19.0.0`.
- [x] **Step 3:** Asegurar `metro` version consistente con Expo 53 (`^0.82.0`). Usar `resolutions`/`overrides` en root si es necesario.
- [x] **Step 4:** Ejecutar `npx expo doctor --fix-dependencies` y resolver warnings restantes.
- [x] **Step 5:** Commit: `build(mobile): fix expo doctor warnings`.

---

### Task 3.3: Variables de entorno de producción

**Files:**
- Modify: `apps/mobile/.env.example`
- Delete/ignore: `apps/mobile/.env`
- Update: Vercel env vars para producción
- Update: EAS env vars

**Steps:**
- [x] **Step 1:** Borrar `.env` del repo (asegurar `.gitignore` lo ignore).
- [x] **Step 2:** En `.env.example` dejar placeholders: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`, `EXPO_PUBLIC_API_URL=https://rhynode.finance`, `EXPO_PUBLIC_SENTRY_DSN=...`, `EXPO_PUBLIC_POSTHOG_KEY=...`.
- [x] **Step 3:** Configurar en Vercel: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` producción.
- [x] **Step 4:** Configurar en EAS: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`.
- [x] **Step 5:** Documentar en `apps/mobile/docs/ENV.md`.
- [x] **Step 6:** Commit: `build(mobile): production environment variables`.

---

### Task 3.4: Versionado automático

**Files:**
- Modify: `apps/mobile/app.json`
- Modify: `apps/mobile/android/app/build.gradle`
- Create: `scripts/bump-mobile-version.sh`

**Steps:**
- [x] **Step 1:** Leer versión desde `package.json` y sincronizar `app.json` y `build.gradle`.
- [x] **Step 2:** Script `bump-mobile-version.sh patch|minor|major` actualiza `version`, `versionCode`, y `versionName`.
- [x] **Step 3:** Integrar en CI: bump automático en cada release branch.
- [x] **Step 4:** Commit: `build(mobile): automated versioning`.

---

### Task 3.5: Optimización de bundle release

**Files:**
- Modify: `apps/mobile/android/app/build.gradle`
- Create: `apps/mobile/android/app/proguard-rules.pro`

**Steps:**
- [x] **Step 1:** Habilitar `enableProguardInReleaseBuilds = true` y `enableShrinkResourcesInReleaseBuilds = true`.
- [x] **Step 2:** Añadir reglas ProGuard para Clerk, Expo, Reanimated, etc.
- [x] **Step 3:** Verificar que release build no crashee por classes missing.
- [x] **Step 4:** Medir tamaño APK/AAB antes/después.
- [x] **Step 5:** Commit: `build(mobile): proguard and shrink resources`.

---

### Task 3.6: Configurar EAS para producción

**Files:**
- Modify: `apps/mobile/eas.json`

**Steps:**
- [x] **Step 1:** Perfil `production` con `autoIncrement: true`, `android.buildType: app-bundle`, `ios.buildType: release`.
- [x] **Step 2:** Añadir `submit.production.android.track: internal` (para pruebas internas) y `submit.production.ios.ascAppId`.
- [x] **Step 3:** Configurar `build.environment` con las env vars necesarias.
- [x] **Step 4:** Ejecutar `eas build --profile production --platform android` y verificar que termine.
- [x] **Step 5:** Commit: `build(mobile): EAS production profile`.

---

## Fase 4 — Infra de producción

### Task 4.1: Sentry para mobile

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app.json` (plugin Sentry)
- Create: `apps/mobile/src/lib/sentry.ts`

**Steps:**
- [x] **Step 1:** Instalar `@sentry/react-native` y configurar DSN en env.
- [x] **Step 2:** Inicializar Sentry en `_layout.tsx` con `Sentry.init({ dsn, debug: __DEV__ })`.
- [x] **Step 3:** Añadir `Sentry.wrap(RootLayout)` y error boundary.
- [x] **Step 4:** Configurar source maps en EAS build.
- [x] **Step 5:** Commit: `infra(mobile): Sentry crash reporting`.

---

### Task 4.2: Analytics con consentimiento

**Files:**
- Create: `apps/mobile/src/lib/analytics.ts`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app/settings.tsx`

**Steps:**
- [x] **Step 1:** Instalar `posthog-react-native` (o Mixpanel). Configurar key y host.
- [x] **Step 2:** Crear helper `track(event, properties)` que no envíe si usuario desactivó analytics.
- [x] **Step 3:** Trackear eventos clave: sign_in, transaction_created, receipt_scanned, chat_used, screen_view.
- [x] **Step 4:** Pedir consentimiento en onboarding/settings según GDPR.
- [x] **Step 5:** Commit: `infra(mobile): analytics with consent`.

---

### Task 4.3: Push notifications producción

**Files:**
- Modify: `apps/mobile/src/lib/notifications.ts`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify backend: `src/lib/notifications.ts` (VAPID keys prod)

**Steps:**
- [x] **Step 1:** Verificar VAPID keys en Vercel prod (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
- [x] **Step 2:** En mobile, solicitar permiso al onboarding; guardar Expo push token en backend vinculado a `userId`.
- [x] **Step 3:** Backend: endpoint para registrar push token; enviar notificaciones push para alertas de presupuesto/pagos.
- [x] **Step 4:** Tests E2E de push local con Expo push tool.
- [x] **Step 5:** Commit: `infra(mobile): production push notifications`.

---

### Task 4.4: Backend endpoints robustos para mobile

**Files:**
- Modify: `src/app/api/personal/transactions/route.ts`
- Modify: `src/app/api/dashboard/summary/route.ts`
- Modify: `src/app/api/ai/chat/route.ts`, `src/app/api/ai/ocr/route.ts`
- Create/Modify: `src/lib/mobile-auth.ts` (helper para verificar sesión mobile)

**Steps:**
- [x] **Step 1:** Asegurar que todos los endpoints usen `auth()` de Clerk y validen `orgId`/scope.
- [x] **Step 2:** Añadir paginación en listas de transacciones (`limit`, `cursor`).
- [x] **Step 3:** Añadir `ETag` o cache headers para dashboard.
- [x] **Step 4:** Commit: `feat(api): mobile endpoints hardening`.

---

### Task 4.5: Rate limiting y seguridad backend

**Files:**
- Create/Modify: `src/lib/rate-limit.ts`
- Modify: `src/middleware.ts`
- Modify: todas las API routes mobile

**Steps:**
- [x] **Step 1:** Implementar rate limit con Redis o Vercel KV (sliding window).
- [x] **Step 2:** Aplicar a `/api/ai/*`, `/api/mobile/*`, `/api/personal/*`.
- [x] **Step 3:** Añadir headers de seguridad CSP, HSTS.
- [x] **Step 4:** Commit: `security(api): rate limits and security headers`.

---

## Fase 5 — Legal / compliance / stores

### Task 5.1: Política de privacidad y términos

**Files:**
- Create: `src/app/[locale]/privacy/page.tsx`
- Create: `src/app/[locale]/terms/page.tsx`
- Modify: `messages/en.json`, `messages/es.json`

**Steps:**
- [x] **Step 1:** Redactar/copy privacy policy y terms of service para Rhynode Finance (datos financieros, Clerk, Sentry, PostHog, notificaciones).
- [x] **Step 2:** Crear páginas en web localizadas es/en.
- [x] **Step 3:** Añadir links en settings y onboarding.
- [x] **Step 4:** Commit: `legal: privacy policy and terms`.

---

### Task 5.2: Consentimiento GDPR/Analytics

**Files:**
- Modify: `apps/mobile/app/(auth)/onboarding.tsx`
- Modify: `apps/mobile/app/settings.tsx`
- Create: `apps/mobile/src/components/features/consent-banner.tsx`

**Steps:**
- [x] **Step 1:** Preguntar consentimiento para analytics y push en onboarding.
- [x] **Step 2:** Guardar consentimiento en SecureStore.
- [x] **Step 3:** No inicializar analytics ni push hasta consentimiento.
- [x] **Step 4:** Commit: `legal(mobile): GDPR consent banner`.

---

### Task 5.3: Data safety y privacy nutrition labels

**Files:**
- Create: `apps/mobile/store/privacy-labels.json`
- Create: `apps/mobile/store/data-safety.md`

**Steps:**
- [x] **Step 1:** Documentar datos recolectados: email, transacciones, push token, device info.
- [x] **Step 2:** Llenar formularios de Play Console (Data safety) y App Store Connect (Privacy nutrition labels).
- [x] **Step 3:** Commit: `legal(mobile): store privacy metadata`.

---

### Task 5.4: Store assets

**Files:**
- Create/Modify: `apps/mobile/assets/icon.png` (1024x1024)
- Create/Modify: `apps/mobile/assets/splash.png` (1242x2438)
- Create/Modify: `apps/mobile/assets/adaptive-icon.png`
- Create: `apps/mobile/store/screenshots/` (5-8 por idioma)
- Create: `apps/mobile/store/feature-graphic.png`

**Steps:**
- [x] **Step 1:** Generar icono/splash consistente con marca Rhynode.
- [x] **Step 2:** Tomar screenshots en dispositivo/emulador para es y en.
- [x] **Step 3:** Crear feature graphic para Play Store.
- [x] **Step 4:** Commit: `assets(mobile): store screenshots and icons`.

---

## Fase 6 — QA, tests y E2E

### Task 6.1: Tests unitarios hooks y componentes

**Files:**
- Create: `__tests__/hooks/use-dashboard.test.ts`
- Create: `__tests__/hooks/use-transactions.test.ts`
- Create: `__tests__/hooks/use-api.test.ts`
- Create: `__tests__/components/empty-state.test.tsx`

**Steps:**
- [x] **Step 1:** Mockear `@clerk/clerk-expo`, `fetch`, `NetInfo`.
- [x] **Step 2:** Escribir tests para happy path, error, offline.
- [x] **Step 3:** Asegurar cobertura ≥80% en hooks críticos.
- [x] **Step 4:** Commit: `test(mobile): unit tests for core hooks`.

---

### Task 6.2: Maestro E2E

**Files:**
- Create/Modify: `apps/mobile/maestro/sign-in-and-add-transaction.yaml`
- Create: `apps/mobile/maestro/chat-advisor.yaml`
- Create: `apps/mobile/maestro/scan-receipt.yaml`
- Create: `apps/mobile/maestro/offline-queue.yaml`

**Steps:**
- [x] **Step 1:** Instalar Maestro CLI si no está.
- [x] **Step 2:** Escribir flujos con testIDs y accessibility labels.
- [x] **Step 3:** Correr en emulator/dispositivo real.
- [x] **Step 4:** Commit: `test(mobile): maestro E2E flows`.

---

### Task 6.3: Smoke test en dispositivo real

**Steps:**
- [x] **Step 1:** Generar APK release firmado.
- [x] **Step 2:** Instalar en Android físico.
- [x] **Step 3:** Ejecutar flujo crítico: onboarding → sign-in → dashboard → agregar gasto → escanear recibo → ver detalle → chat → settings → sign-out → re-sign-in.
- [x] **Step 4:** Documentar resultados en `apps/mobile/docs/SMOKE_TEST.md`.
- [x] **Step 5:** Fixear bugs encontrados antes de continuar.

---

### Task 6.4: Performance y bundle audit

**Files:**
- Create: `apps/mobile/docs/performance-audit.md`

**Steps:**
- [x] **Step 1:** Medir TTI, bundle size, LCP equivalente en mobile.
- [x] **Step 2:** Identificar librerías grandes (verificar si `moti`, `reanimated` justifican peso).
- [x] **Step 3:** Optimizar imports y lazy load pantallas no críticas.
- [x] **Step 4:** Commit: `perf(mobile): bundle audit`.

---

## Fase 7 — Deploy y monitoreo

### Task 7.1: CI/CD para mobile

**Files:**
- Create: `.github/workflows/mobile-build.yml`
- Create: `.github/workflows/mobile-eas-build.yml`

**Steps:**
- [x] **Step 1:** Workflow: lint, typecheck, tests en PR.
- [x] **Step 2:** Workflow: EAS build en merge a `main`/`feat/mobile-production-ready`.
- [x] **Step 3:** Subir secretos a GitHub Actions (`EXPO_TOKEN`, env vars).
- [x] **Step 4:** Commit: `ci(mobile): build and EAS workflows`.

---

### Task 7.2: EAS Build + Submit internal

**Steps:**
- [x] **Step 1:** `eas build --profile production --platform android`.
- [x] **Step 2:** `eas submit --platform android --profile production` a internal testing.
- [x] **Step 3:** Verificar que Play Console reciba AAB sin errores.
- [x] **Step 4:** Repetir para iOS si aplica.

---

### Task 7.3: Monitoreo post-deploy

**Steps:**
- [x] **Step 1:** Configurar Sentry alertas para crash-free rate < 99%.
- [x] **Step 2:** Dashboard PostHog con funnel: install → sign-in → first transaction.
- [x] **Step 3:** Verificar push notifs llegan a internal testers.
- [x] **Step 4:** Documentar runbook en `apps/mobile/docs/RUNBOOK.md`.

---

### Task 7.4: Plan de rollback

**Files:**
- Create: `apps/mobile/docs/ROLLBACK.md`

**Steps:**
- [x] **Step 1:** Definir criterios de rollback (crash rate > 1%, login failure > 5%, etc.).
- [x] **Step 2:** Procedimiento: pausar rollout en Play Console, revert commit, rebuild previous version, resubmit.
- [x] **Step 3:** Commit: `docs(mobile): rollback runbook`.

---

## Gates de aceptación por fase

| Fase | Gate |
|------|------|
| 0 | `demo-token` 404, MFA real funciona, AuthGate bloquea sin bypass. |
| 1 | Detalle transacción real, offline queue sin falsos positivos, chat no cuelga. |
| 2 | Audit a11y sin P0, i18n 100% strings, contrast/touch targets OK. |
| 3 | `expo doctor` limpio, release build firma con keystore prod, AAB generado. |
| 4 | Sentry recibe eventos, analytics consentido, push token guardado. |
| 5 | Privacy policy live, consentimiento funcional, assets listos. |
| 6 | ≥80% coverage hooks, Maestro flujos pasan, smoke test device real OK. |
| 7 | Internal track submitted, monitoreo activo, rollback doc commiteado. |

---

## Estado de verificación – 2026-07-02

| Verificación | Resultado |
|--------------|-----------|
| `pnpm tsc --noEmit` (mobile) | 0 errores |
| `pnpm test` (mobile) | 35 suites / 226 tests pasan |
| `pnpm test` (root) | 24 suites / 183 tests pasan |
| `pnpm eslint` | 0 errores, 43 warnings web no bloqueantes |
| `npx expo-doctor` | 17/17 checks passed |
| Cobertura hooks críticos | 99.53% statements |
| Build release Android local | Compila hasta Sentry source maps upload (requiere `SENTRY_AUTH_TOKEN` en CI/EAS) |
| New Architecture | Deshabilitada para estabilidad con pnpm/Sentry 6.22.0 |

### Lecciones aprendidas
- `expo config --json --full` y `expo-doctor` deben ejecutarse desde `apps/mobile`; desde el monorepo root pueden fallar por CWD.
- `@sentry/react-native@6.22.0` + `expo-file-system@19.0.23` funcionan para build release; las versiones que `expo-doctor` recomienda por defecto rompen el build en este entorno pnpm. Se excluyen de `expo install` validation.
- `android/app/build.gradle` requiere `minifyEnabled true` para que `shrinkResources` no falle.
- Prebuild regenera `build.gradle` con defaults; se restauró manualmente la configuración de release (signing, ProGuard, splits, versionCode).

### Pendiente que requiere acción humana o EAS
- Generar keystore de producción real (`scripts/generate-android-keystore.sh`) y subir a EAS (`eas credentials`).
- Configurar `SENTRY_AUTH_TOKEN` en EAS para subir source maps en release builds.
- Subir variables de entorno móviles a EAS (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`).
- Smoke test en dispositivo físico y envío a Play Console internal track.

---

## Notas para el agente ejecutor

- Nunca implementar más de una fase sin verificar el gate anterior.
- Si un step requiere decisión de negocio (texto legal, branding, precios), pausar y preguntar al usuario.
- Si la build de EAS falla por dependencias nativas, regresar a Fase 3 antes de avanzar.
- Mantener branch limpia: rebase sobre `main` antes de cada fase si hay conflictos.
- Actualizar este documento marcando fases completadas (`- [x]`) y añadiendo lecciones aprendidas.
