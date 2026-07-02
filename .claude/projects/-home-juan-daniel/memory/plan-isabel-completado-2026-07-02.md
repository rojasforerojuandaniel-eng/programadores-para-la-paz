---
name: plan-isabel-completado-2026-07-02
description: Plan Isabel ejecutado en Rhynode Finance Mobile; APK release listo para instalar en Android.
metadata: 
  node_type: memory
  type: project
  originSessionId: 394a4d89-9fae-4a98-a54c-040e4f502144
---

# Plan Isabel — APK release listo 2026-07-02

Ejecuté el Plan Isabel en `feat/mobile-android-perfect-2026-06-30` hasta tener un **APK release firmado listo para instalar en Android**. La app pasa todos los gates automáticos y el build release compila exitosamente.

**Plan tracked:** `rhynode-finance/docs/superpowers/plans/2026-06-30-plan-isabel.md`
**Branch:** `feat/mobile-android-perfect-2026-06-30`
**APK listo:** `rhynode-finance/apps/mobile/app-release-arm64.apk` (35 MB, ARM 64-bit)

## Verificaciones finales

| Check | Resultado |
|-------|-----------|
| `pnpm tsc --noEmit` (mobile) | 0 errores |
| `pnpm test` (mobile) | 35 suites / 226 tests pasan |
| `pnpm test` (root) | 24 suites / 183 tests pasan |
| `pnpm eslint` | 0 errores, 43 warnings web no bloqueantes |
| `npx expo-doctor` (desde `apps/mobile`) | 17/17 checks passed |
| Cobertura hooks críticos | 99.53% statements |
| Android release build local | **BUILD SUCCESSFUL** |
| APK firmado | Sí, certificado `CN=Rhynode Finance, OU=Rhynode, O=Rhynode, L=Bogota, C=CO` |

## APK generado

```
rhynode-finance/apps/mobile/android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
rhynode-finance/apps/mobile/android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk
rhynode-finance/apps/mobile/android/app/build/outputs/apk/release/app-x86_64-release.apk
```

Copia de fácil acceso:

```
rhynode-finance/apps/mobile/app-release-arm64.apk
```

## Cómo instalar en tu Android

### Opción 1: adb (recomendado)

Conectar el teléfono por USB con **depuración USB habilitada**, luego:

```bash
cd rhynode-finance/apps/mobile
adb install app-release-arm64.apk
```

### Opción 2: transferencia manual

1. Copiar `app-release-arm64.apk` al teléfono (cable USB, Bluetooth, Drive, etc.).
2. En el teléfono, abrir el archivo con el gestor de archivos.
3. Permitir "Instalar apps de fuentes desconocidas" si se solicita.
4. Instalar y abrir `Rhynode`.

## Fases cerradas

- **Fase 0 — Seguridad/auth:** demo-token eliminado, MFA real con TOTP/backup, AuthGate con biometría + PIN, sign-out seguro, rate limiting en APIs.
- **Fase 1 — Funcionalidad crítica:** detalle de transacción real, offline queue robusta con dead letter, Zod runtime validation, chat con abort/timeout, cámara offline + compresión.
- **Fase 2 — UX/UI/a11y:** a11y base, formularios accesibles, estados empty/error/loading, reduced motion, i18n es/en, toast queue, settings real.
- **Fase 3 — Build/release engineering:** keystore real generado, bump version script, Expo doctor limpio, versionado, ProGuard, EAS production profile, Android project regenerado con release signing.
- **Fase 4 — Infra:** Sentry init + wrap, PostHog analytics con consentimiento, push notifications con consent gate, backend endpoints robustos con paginación/cache.
- **Fase 5 — Legal/stores:** privacy/terms pages, consent banner, data safety/privacy labels, store assets (icon, splash, screenshots, feature graphic).
- **Fase 6 — QA:** cobertura >80% hooks, Maestro E2E flows, smoke test checklist, performance audit doc.
- **Fase 7 — Deploy/monitoreo:** CI workflows (mobile-build + mobile-eas-build), RUNBOOK.md, ROLLBACK.md.

## Cambios de build importantes

- `android/` regenerado con `npx expo prebuild --clean --platform android`.
- `newArchEnabled: false` en Android e iOS para estabilidad con pnpm + Sentry 6.22.0.
- `metro.config.js`: removido `unstable_enableSymlinks` (Expo 53 lo maneja nativamente).
- `apps/mobile/package.json`: `@sentry/react-native` y `expo-file-system` excluidos de `expo install` validation porque las versiones recomendadas por Expo doctor rompen el build en este layout pnpm.
- `android/app/build.gradle`: release signing con keystore real, ProGuard + shrink resources, ABI splits arm64-v8a/ armeabi-v7a/x86_64.
- Sentry source maps upload deshabilitado en build local (`SENTRY_DISABLE_AUTO_UPLOAD=true`) porque requiere `SENTRY_AUTH_TOKEN`.

## Archivos sensibles creados (gitignored)

- `rhynode-finance/apps/mobile/android/app/rhynode-release.keystore`
- `rhynode-finance/apps/mobile/android/app/rhynode-release.credentials.properties`
- `rhynode-finance/apps/mobile/android/local.properties`

Estos archivos NUNCA deben commitearse.

## Commits recientes (orden inverso)

```
docs(mobile): APK release ready with install instructions and gitignore secrets
docs(memory): record Plan Isabel completion and verification status
docs(mobile): mark Plan Isabel complete and add verification status
build(mobile): regenerate Android project with production release config
build(mobile): configure EAS ignore and remove stale package-lock
feat(mobile): wire Sentry init and push consent gate in layout
build(mobile): fix expo doctor warnings - metro config and package versions
chore(lint): ignore vendor/android/ios and fix consent-banner test require()
build(mobile): automated versioning script
```

## Siguiente paso: Play Store / EAS (requiere credenciales reales)

1. Subir el keystore a EAS: `eas credentials` (requiere sesión Expo interactiva).
2. Configurar `SENTRY_AUTH_TOKEN` en EAS para source maps.
3. Subir env vars a EAS: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (producción), `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`.
4. Configurar `EXPO_TOKEN` en GitHub Actions.
5. Ejecutar smoke test en dispositivo físico y subir AAB a Play Console internal track.

**Why:** El APK release local ya está listo para instalar y probar. La publicación en Play Store requiere credenciales de producción que solo el dueño del proyecto puede proporcionar.

**How to apply:** Para instalar ahora, usar `adb install app-release-arm64.apk`. Para Play Store, seguir los pasos de EAS arriba y ejecutar `eas build --profile production --platform android`.
