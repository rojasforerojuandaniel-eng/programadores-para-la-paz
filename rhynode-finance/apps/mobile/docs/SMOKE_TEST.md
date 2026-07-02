# Smoke Test – Rhynode Finance Mobile

Checklist manual de flujo crítico para validar una build antes de release. Ejecutar en un dispositivo físico o emulador Android/iOS con backend de producción o staging.

## Pre-requisos

- App instalada (`com.rhynode.finance`).
- Conexión a internet estable.
- Cuenta de prueba con credenciales válidas.
- Permisos de cámara concedidos (para escanear recibo).

## APK release local listo para instalar

La build release firmada está lista en:

```
rhynode-finance/apps/mobile/android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
```

También disponible como copia de fácil acceso:

```
rhynode-finance/apps/mobile/app-release-arm64.apk
```

### Instalar en Android físico

1. Conectar el teléfono por USB con **depuración USB habilitada**.
2. Ejecutar:
   ```bash
   cd rhynode-finance/apps/mobile
   adb install android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
   ```
3. Alternativa sin adb: copiar el APK al teléfono y abrirlo con un gestor de archivos (puede requerir "Instalar apps de fuentes desconocidas").

### Variantes disponibles

| APK | Arquitectura | Tamaño aprox. |
|-----|--------------|---------------|
| `app-arm64-v8a-release.apk` | ARM 64-bit (la mayoría de Androids modernos) | ~35 MB |
| `app-armeabi-v7a-release.apk` | ARM 32-bit | ~28 MB |
| `app-x86_64-release.apk` | Emuladores x86_64 | ~36 MB |

### Firma

El APK está firmado con el keystore de producción `rhynode-release.keystore`. Las credenciales se guardan en:

```
rhynode-finance/apps/mobile/android/app/rhynode-release.credentials.properties
```

(archivo gitignored, nunca versionar).

## Flujo crítico

| Paso | Acción | Resultado esperado |
|------|--------|--------------------|
| 1 | Abrir app por primera vez | Onboarding o sign-in visible |
| 2 | Completar onboarding (si aplica) | Redirección a sign-in |
| 3 | Iniciar sesión con email + password o SSO | Dashboard (`Resumen`) carga sin errores |
| 4 | Ver saldo, ingresos y gastos del dashboard | KPIs visibles con datos reales |
| 5 | Tap en **Agregar** (tab o menú) | Formulario de transacción visible |
| 6 | Ingresar descripción, monto y guardar | Toast de éxito; transacción aparece en lista |
| 7 | Ir a **Más** > **Escanear recibo** (o abrir cámara) | Cámara activa; capturar foto |
| 8 | Confirmar OCR / guardar recibo | Datos pre-llenados en formulario o transacción creada |
| 9 | Abrir detalle de la transacción recién creada | Datos correctos: monto, descripción, fecha, tipo |
| 10 | Ir a **Más** > **Asesor IA** | Chat visible |
| 11 | Enviar "¿Cómo voy este mes?" | Respuesta del asistente aparece en el chat |
| 12 | Ir a **Más** > **Ajustes** | Pantalla de settings visible |
| 13 | Tap en **Cerrar sesión** y confirmar | Vuelta a pantalla de sign-in |
| 14 | Volver a iniciar sesión | Dashboard carga y datos persisten |

## Casos offline

| Paso | Acción | Resultado esperado |
|------|--------|--------------------|
| 1 | Activar modo avión | Indicador de red desconectada |
| 2 | Agregar transacción | Toast "Sin conexión. Se guardará cuando vuelvas en línea." |
| 3 | Desactivar modo avión | Transacción se sincroniza; aparece en dashboard/lista |

## Notas

- Si algún paso falla, detener el smoke test y crear un ticket P0.
- Validar también rotación, deep links (`rhynode://`) y notificaciones push si están habilitadas.
