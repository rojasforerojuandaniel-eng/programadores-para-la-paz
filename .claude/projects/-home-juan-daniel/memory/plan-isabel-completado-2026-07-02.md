---
name: plan-isabel-completado-2026-07-02
description: "Plan Isabel ejecutado en Rhynode Finance Mobile; estado final, verificaciones y pasos manuales pendientes."
metadata: 
  node_type: memory
  type: project
  originSessionId: 394a4d89-9fae-4a98-a54c-040e4f502144
---

# Plan Isabel — Completado 2026-07-02

Ejecuté el Plan Isabel en `feat/mobile-android-perfect-2026-06-30` hasta dejar la app mobile lista para producción real. Todas las fases están implementadas y verificadas con tests/typecheck/lint/expo-doctor; el Android release build compila correctamente hasta el paso de subida de source maps a Sentry.

**Plan tracked:** `rhynode-finance/docs/superpowers/plans/2026-06-30-plan-isabel.md`
**Branch:** `feat/mobile-android-perfect-2026-06-30`

## Verificaciones finales

| Check | Resultado |
|-------|-----------|
| `pnpm tsc --noEmit` (mobile) | 0 errores |
| `pnpm test` (mobile) | 35 suites / 226 tests pasan |
| `pnpm test` (root) | 24 suites / 183 tests pasan |
| `pnpm eslint` | 0 errores, 43 warnings web no bloqueantes |
| `npx expo-doctor` (desde `apps/mobile`) | 17/17 checks passed |
| Cobertura hooks críticos | 99.53% statements |
| Android release build local | Compila hasta Sentry source maps upload (requiere `SENTRY_AUTH_TOKEN`) |

## Fases cerradas

- **Fase 0 — Seguridad/auth:** demo-token eliminado, MFA real con TOTP/backup, AuthGate con biometría + PIN, sign-out seguro, rate limiting en APIs.
- **Fase 1 — Funcionalidad crítica:** detalle de transacción real, offline queue robusta con dead letter, Zod runtime validation, chat con abort/timeout, cámara offline + compresión.
- **Fase 2 — UX/UI/a11y:** a11y base, formularios accesibles, estados empty/error/loading, reduced motion, i18n es/en, toast queue, settings real.
- **Fase 3 — Build/release engineering:** keystore script, bump version script, Expo doctor limpio, versionado, ProGuard, EAS production profile, Android project regenerado con release signing.
- **Fase 4 — Infra:** Sentry init + wrap, PostHog analytics con consentimiento, push notifications con consent gate, backend endpoints robustos con paginación/cache.
- **Fase 5 — Legal/stores:** privacy/terms pages, consent banner, data safety/privacy labels, store assets (icon, splash, screenshots, feature graphic).
- **Fase 6 — QA:** cobertura >80% hooks, Maestro E2E flows, smoke test checklist, performance audit doc.
- **Fase 7 — Deploy/monitoreo:** CI workflows (mobile-build + mobile-eas-build), RUNBOOK.md, ROLLBACK.md.

## Cambios de build importantes

- `android/` regenerado con `npx expo prebuild --clean --platform android`.
- `newArchEnabled: false` en Android e iOS para estabilidad con pnpm + Sentry 6.22.0.
- `metro.config.js`: removido `unstable_enableSymlinks` (Expo 53 lo maneja nativamente).
- `apps/mobile/package.json`: `@sentry/react-native` y `expo-file-system` excluidos de `expo install` validation porque las versiones recomendadas por Expo doctor rompen el build en este layout pnpm.
- `android/app/build.gradle`: release signing via env vars, ProGuard + shrink resources, ABI splits arm64-v8a/ armeabi-v7a/x86_64.

## Commits recientes (orden inverso)

```
docs(mobile): mark Plan Isabel complete and add verification status
build(mobile): regenerate Android project with production release config
build(mobile): configure EAS ignore and remove stale package-lock
feat(mobile): wire Sentry init and push consent gate in layout
build(mobile): fix expo doctor warnings - metro config and package versions
chore(lint): ignore vendor/android/ios and fix consent-banner test require()
build(mobile): automated versioning script
```

## Pasos que requieren acción humana / EAS

1. **Keystore real:** ejecutar `scripts/generate-android-keystore.sh` con passwords fuertes y subir a EAS (`eas credentials`).
2. **Sentry auth:** configurar `SENTRY_AUTH_TOKEN` en EAS para subir source maps en release builds.
3. **Env vars EAS:** `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`.
4. **GitHub secrets:** `EXPO_TOKEN` para el workflow `mobile-eas-build.yml`.
5. **Smoke test físico:** instalar APK/AAB en Android real y ejecutar flujo crítico.
6. **Play Console:** subir AAB a internal testing track.

**Why:** La app ya pasa todos los gates automáticos del plan; lo que queda son operaciones que requieren credenciales reales de producción o un dispositivo físico.

**How to apply:** Seguir los pasos manuales arriba en orden; antes de cada release futuro, ejecutar `npx expo-doctor` desde `apps/mobile` y `./gradlew assembleRelease` con keystore real.
