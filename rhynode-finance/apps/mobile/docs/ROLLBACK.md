# Rollback – Rhynode Finance Mobile

Procedimiento para revertir una versión móvil en producción cuando las métricas de salud superan los umbrales críticos.

## 1. Criterios de rollback

Ejecutar este runbook **inmediatamente** si se cumple cualquiera de los siguientes umbrales en producción dentro de las primeras 2 horas después del rollout:

| Métrica | Umbral crítico | Fuente |
|---------|---------------|--------|
| Crash-free session rate | < 99 % (crash rate > 1 %) | Sentry Release Health |
| Login failure rate | > 5 % de intentos fallidos | PostHog `user_signed_in` + Vercel `/api/auth/*` logs |
| Error rate de backend móvil | > 5 % 5xx en `/api/mobile/*` | Vercel logs |
| ANR rate Android | > 0.5 % | Google Play Console |

Si el síntoma es menor (entre amarillo y naranja), evaluar hotfix en lugar de rollback completo.

## 2. Pasos de rollback

### Paso 1 – Pausar el rollout en Play Console

1. Entrar a [Google Play Console](https://play.google.com/console).
2. Seleccionar **Rhynode Finance** → **Producción**.
3. En la versión activa, hacer clic en **Pausar lanzamiento** (Pause release).
4. Confirmar que el estado pasa a **Pausado**.
5. Si el rollout estaba en etapas (staged), bajar el porcentaje a **0 %**.

### Paso 2 – Revertir el commit del release

```bash
# 1. Asegurarse de estar en la branch de release
git checkout feat/mobile-production-ready
git pull origin feat/mobile-production-ready

# 2. Identificar el commit del release problemático
git log --oneline -10

# 3. Revertir el commit del release (crea un commit de revert)
git revert --no-edit <bad-release-commit-hash>

# 4. Push del revert
git push origin feat/mobile-production-ready
```

### Paso 3 – Reconstruir la versión anterior estable

1. Identificar el último commit estable antes del release problemático:
   ```bash
   git log --oneline --graph -20
   ```
2. Crear una build de producción de ese commit usando EAS:
   ```bash
   git checkout <last-stable-commit-hash>
   pnpm install --frozen-lockfile
   pnpm --filter @rhynode/mobile exec eas build \
     --profile production \
     --platform android \
     --non-interactive
   ```
   Nota: si el rollback es urgente, se puede omitir el build local y disparar el workflow `mobile-eas-build.yml` haciendo push del revert a `feat/mobile-production-ready`.

3. Esperar a que la build termine:
   ```bash
   pnpm --filter @rhynode/mobile exec eas build:list --platform android --profile production
   ```

### Paso 4 – Resubir la versión anterior a Play Console

1. Descargar el AAB generado:
   ```bash
   pnpm --filter @rhynode/mobile exec eas build:download \
     --platform android \
     --build-id <stable-build-id>
   ```
2. En Google Play Console, ir a **Producción** → **Crear lanzamiento**.
3. Subir el AAB descargado.
4. Completar notas de lanzamiento con:
   ```
   Rollback a versión anterior estable por incumplimiento de umbrales de salud.
   Issue: [enlace a ticket P0].
   ```
5. Revisar y **lanzar a producción** (inicialmente al mismo porcentaje que tenía la versión problemática, o 10 % si se prefiere cautela).

### Paso 5 – Verificar recuperación

1. Esperar 30 minutos y revisar Sentry:
   - Crash-free rate debe volver a ≥ 99 %.
2. Revisar PostHog funnel:
   - Login failure rate debe bajar a < 5 %.
3. Revisar Vercel logs:
   - Sin picos de 5xx en `/api/mobile/*`.
4. Si todo está estable después de 1 hora, aumentar el rollout al 100 %.

## 3. Comunicación durante el incidente

1. Abrir un canal de guerra en `#mobile-incident`.
2. Postear:
   - Versión afectada.
   - Métrica que disparó el rollback.
   - ETA de resolución.
3. Actualizar cada 30 minutos hasta resolución.
4. Cerrar con post-mortem en 24 horas.

## 4. Rollback parcial (hotfix rápido)

Si el problema se detecta en una feature aislada y no afecta el flujo crítico:

1. Crear hotfix branch desde `feat/mobile-production-ready`:
   ```bash
   git checkout -b hotfix/mobile-<descripcion>
   ```
2. Aplicar el fix mínimo.
3. PR a `feat/mobile-production-ready` con review acelerado.
4. Mergear y dejar que `mobile-eas-build.yml` dispare la build.
5. No pausar el rollout salvo que el fix falle.
