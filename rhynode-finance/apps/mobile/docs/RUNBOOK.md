# Runbook – Rhynode Finance Mobile

Guía de operación, monitoreo y respuesta ante incidentes para la app móvil Android.

## 1. Dónde ver salud de la app

### 1.1 Sentry (errores y crash-free rate)

- URL del proyecto: `https://rhynode.sentry.io/projects/mobile/` (ajustar al slug real de Sentry).
- Métricas clave:
  - **Crash-free rate**: porcentaje de sesiones sin crash. Objetivo ≥ 99 %.
  - **Crash-free users**: usuarios únicos sin crash.
  - **Release health**: filtra por versión (`release:com.rhynode.finance@<version>`).
- Cómo navegar:
  1. Issues → filtrar por `release` y `environment:production`.
  2. Releases → seleccionar la build activa → ver **Crash Free Session Rate**.
  3. Performance → ver tiempos de inicio de la app y transacciones principales.

### 1.2 PostHog (adopción y funnel)

- URL del proyecto: `https://app.posthog.com/project/<id>`.
- Dashboards recomendados:
  - **Mobile installs**: evento `Application Installed` (o equivalente).
  - **Sign-in success**: evento `user_signed_in`.
  - **First transaction**: evento `transaction_created` con `transactionCount == 1`.
- Funnel crítico: `install → sign-in → first transaction`.

### 1.3 Vercel (logs del backend)

- Dashboard: `https://vercel.com/rhynode/rhynode-finance`.
- Logs en CLI:
  ```bash
  vercel logs rhynode-finance --production
  ```
- Filtros útiles:
  ```bash
  vercel logs rhynode-finance --production --level=error
  vercel logs rhynode-finance --production --path=/api/mobile
  ```

## 2. Comandos comunes

```bash
# Ver logs de producción de Vercel
vercel logs rhynode-finance --production

# Ver logs filtrados por error
vercel logs rhynode-finance --production --level=error

# Listar builds de EAS
pnpm --filter @rhynode/mobile exec eas build:list

# Listar builds de producción Android
pnpm --filter @rhynode/mobile exec eas build:list --platform android --profile production

# Ver estado de una build específica
pnpm --filter @rhynode/mobile exec eas build:view <build-id>

# Descargar AAB/APK de una build
pnpm --filter @rhynode/mobile exec eas build:download --platform android --build-id <build-id>
```

## 3. Alertas de monitoreo

### 3.1 Sentry: crash-free rate < 99 %

1. Ir a **Alerts** → **Create Alert Rule**.
2. Seleccionar **Crash Free Session Rate**.
3. Configurar:
   - Environment: `production`.
   - Threshold: **Below 99 %**.
   - Time window: **5 minutes**.
   - Filter: `release.version:latest` o la versión activa.
4. Agregar destino (Slack / PagerDuty / email del equipo mobile).
5. Nombre de la alerta: `Mobile crash-free rate < 99%`.

### 3.2 PostHog: funnel install → sign-in → first transaction

1. Ir a **Product Analytics** → **Funnels**.
2. Crear funnel con 3 pasos:
   - Paso 1: evento `Application Installed`.
   - Paso 2: evento `user_signed_in`.
   - Paso 3: evento `transaction_created` con filtro `transactionCount equals 1`.
3. Configurar ventana de conversión: **7 días**.
4. Agregar breakdown por `release` o `platform`.
5. Guardar y agregar al dashboard **Mobile Activation**.
6. (Opcional) Crear alerta si la conversión install→sign-in baja de 40 % o sign-in→first transaction baja de 20 %.

## 4. Chequeo rápido de incidente

| Síntoma | Dónde mirar | Acción inmediata |
|---------|-------------|------------------|
| Aumento de crashes | Sentry Issues / Release Health | Ver stack trace; si es > 1 %, seguir `ROLLBACK.md` |
| Login falla | PostHog sign-in funnel + Vercel logs | Verificar `/api/auth/*`; si > 5 %, seguir `ROLLBACK.md` |
| Builds de EAS fallan | GitHub Actions `mobile-eas-build.yml` | Revisar logs; fix en branch y re-run |
| App lenta / ANR | Sentry Performance + Play Console ANR | Revisar tiempos de inicio y main-thread |

## 5. Contactos y canales

- Equipo mobile: `#mobile-alerts` (Slack).
- Oncall: rotación definida en PagerDuty.
- Escalamiento: @juan-daniel (lead) → @sre-oncall.
