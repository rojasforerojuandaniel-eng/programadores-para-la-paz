# Waydroid + Rhynode Finance Android Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el emulador Android Studio (que colapsa por OOM) por Waydroid como emulador Android local ligero, y limpiar todo lo instalado/configurado para Android Studio/Gradle/QEMU que ya no se usará.

**Architecture:** Waydroid es un contenedor LXC que ejecuta Android real sobre el kernel de Linux; consume <1 GB de RAM en reposo. Rhynode Finance mobile es una app Expo 53 con native modules; usaremos EAS Build para generar el APK/development build y luego ejecutarlo en Waydroid. El directorio `android/` pre-generado y la guía EMULATOR_RAM_GUIDE.md se eliminan porque EAS Build recrea el nativo en la nube.

**Tech Stack:** Ubuntu/Pop!_OS, Waydroid, Expo 53, EAS CLI, pnpm, Metro.

---

## Pre-condiciones y advertencias

- La máquina tiene ~6.9 GB de RAM. Waydroid es la única opción local viable.
- Requiere kernel Linux con módulos `binder_linux` y `ashmem` o `memfd`. Verificar antes de instalar.
- Requiere entorno Wayland. En sesión X11 se necesita un nested compositor.
- La app usa native modules (Clerk, SQLite, notifications, camera, local auth). Expo Go NO es suficiente; se requiere **development build** (EAS Build).

---

## File Structure

### Eliminaciones seguras
- `apps/mobile/android/` — generado por `expo prebuild`; EAS Build lo recrea.
- `apps/mobile/EMULATOR_RAM_GUIDE.md` — guía para emulador Android Studio, ya no aplica.
- Entradas en `.bashrc` de `ANDROID_HOME`, `ANDROID_SDK_ROOT` y PATH de Android SDK.
- Directorios globales: `~/Android/Sdk`, `~/.android/avd`, `~/.gradle/` (liberan ~2+ GB).

### Archivos a conservar/ajustar
- `apps/mobile/metro.config.js` — conservar `maxWorkers=2` y symlinks para pnpm.
- `apps/mobile/eas.json` — ya tiene perfiles `development`/`preview`/`production`; ajustar `preview` para APK.
- `apps/mobile/package.json` — conservar scripts; añadir `prebuild` opcional.
- `apps/mobile/app.json` — conservar plugins y configuración Android/iOS.

### Archivos nuevos
- `docs/superpowers/plans/2026-06-29-waydroid-rhynode-finance-android.md` (este plan).
- Posible script helper `apps/mobile/scripts/waydroid-start.sh` para arrancar Waydroid con opciones ligeras.

---

## Task 1: Verificar soporte del sistema para Waydroid

**Files:** ninguno nuevo; solo inspección del sistema.

- [ ] **Step 1: Comprobar módulos del kernel**

```bash
lsmod | grep -E "binder|ashmem"
# Si no hay salida, intentar cargar:
sudo modprobe binder_linux devices="binder,hwbinder,vndbinder"
sudo modprobe ashmem_linux 2>/dev/null || echo "ashmem no requerido en kernels nuevos (usa memfd)"
```

Expected: al menos `binder_linux` aparece en `lsmod`.

- [ ] **Step 2: Verificar entorno gráfico**

```bash
echo $XDG_SESSION_TYPE
```

Expected: `wayland` es ideal. Si dice `x11`, se usará `weston` o `waydroid-big-screen` en ventana.

- [ ] **Step 3: Verificar virtualización**

```bash
kvm-ok 2>/dev/null || egrep -c '(vmx|svm)' /proc/cpuinfo
```

Expected: >= 1 (KVM acelera el contenedor; sin él Waydroid usa software rendering).

---

## Task 2: Instalar Waydroid

**Files:** ninguno en el repo.

- [ ] **Step 1: Instalar paquetes del sistema**

```bash
sudo apt update
sudo apt install -y waydroid python3-pip curl
```

Expected: `waydroid --version` devuelve una versión.

- [ ] **Step 2: Inicializar Waydroid con imagen LineageOS**

```bash
sudo waydroid init
```

Expected: descarga imagen Android y finaliza sin error.

- [ ] **Step 3: Configurar servicio systemd de Waydroid**

```bash
sudo systemctl enable --now waydroid-container
```

Expected: `systemctl is-active waydroid-container` == `active`.

---

## Task 3: Configurar Waydroid para bajo consumo de RAM

**Files:**
- Modify: `/var/lib/waydroid/waydroid_base.prop` (requiere sudo)
- Modify: `/var/lib/waydroid/waydroid.cfg` (requiere sudo)

- [ ] **Step 1: Limitar RAM asignada a Android**

Editar `/var/lib/waydroid/waydroid_base.prop`:

```properties
ro.hardware.ramSize=2048M
ro.hwui.texture_cache_size=48
ro.hwui.layer_cache_size=32
ro.hwui.path_cache_size=8
ro.hwui.gradient_cache_size=1
ro.hwui.drop_shadow_cache_size=4
ro.hwui.texture_cache_flushrate=0.6
ro.hwui.text_small_cache_width=512
ro.hwui.text_small_cache_height=256
ro.hwui.text_large_cache_width=2048
ro.hwui.text_large_cache_height=512
```

- [ ] **Step 2: Desactivar animaciones en Android**

```bash
# Más adelante, una vez arrancado Android:
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
```

- [ ] **Step 3: Configurar GPU/Renderizado**

Si hay GPU Intel/AMD y sesión Wayland, dejar por defecto. Si es NVIDIA o X11, forzar software rendering editando `/var/lib/waydroid/waydroid.cfg`:

```ini
[properties]
ro.hardware.gralloc=default
ro.hardware.egl=swiftshader
```

---

## Task 4: Arrancar Waydroid y configurar Expo development build

**Files:**
- Modify: `apps/mobile/eas.json`
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Asegurar que eas.json genera APK de development build**

```json
{
  "cli": { "version": ">= 15.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

- [ ] **Step 2: Añadir script de build en package.json**

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "android:build": "eas build --profile preview --platform android",
    "android:dev": "eas build --profile development --platform android",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 3: Construir development build en la nube**

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile
npx eas build --profile development --platform android
```

Expected: EAS Build produce un APK descargable. Puede tardar varios minutos.

---

## Task 5: Eliminar instalaciones del emulador Android Studio

**Files:**
- Delete: `apps/mobile/android/`
- Delete: `apps/mobile/EMULATOR_RAM_GUIDE.md`
- Modify: `~/.bashrc`

- [ ] **Step 1: Borrar directorio android pre-generado**

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile
rm -rf android
```

Expected: `ls android` no existe.

- [ ] **Step 2: Borrar EMULATOR_RAM_GUIDE.md**

```bash
rm apps/mobile/EMULATOR_RAM_GUIDE.md
```

- [ ] **Step 3: Eliminar entradas de Android SDK en ~/.bashrc**

Abrir `~/.bashrc` y borrar/comentar:

```bash
# export ANDROID_HOME=/home/juan-daniel/Android/Sdk
# export ANDROID_SDK_ROOT=/home/juan-daniel/Android/Sdk
# export PATH=$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
```

- [ ] **Step 4: Borrar Android SDK, AVDs y caché de Gradle**

```bash
rm -rf /home/juan-daniel/Android/Sdk
rm -rf /home/juan-daniel/.android/avd
rm -rf /home/juan-daniel/.gradle
```

Expected: liberar ~2+ GB de disco. No afecta Waydroid ni Expo.

- [ ] **Step 5: Commit de limpieza**

```bash
cd /home/juan-daniel/rhynode-finance
git add apps/mobile/
git commit -m "chore(mobile): remove Android Studio emulator files, switch to Waydroid + EAS Build"
```

---

## Task 6: Instalar APK en Waydroid y probar app

**Files:** ninguno nuevo.

- [ ] **Step 1: Arrancar UI de Waydroid**

```bash
waydroid show-full-ui
```

Expected: ventana Android aparece.

- [ ] **Step 2: Instalar APK de desarrollo**

```bash
adb connect 192.168.240.112:5555  # IP típica de Waydroid; verificar con `waydroid status`
adb install -r /ruta/del/descargado/Rhynode-*.apk
```

- [ ] **Step 3: Iniciar Metro y conectar app**

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile
export NODE_OPTIONS="--max-old-space-size=1536"
npx expo start --android
```

Expected: app se conecta a Metro, carga bundle JS y muestra la UI.

- [ ] **Step 4: Capturar evidencia**

Tomar screenshot de Waydroid mostrando Rhynode Finance. Guardar en `apps/mobile/store/waydroid-screenshot.png` o similar.

---

## Task 7: Documentar flujo final

**Files:**
- Create: `apps/mobile/docs/WAYDROID_SETUP.md`

- [ ] **Step 1: Escribir guía mínima de Waydroid para el equipo**

```markdown
# Correr Rhynode Finance en Waydroid

1. Iniciar contenedor: `sudo systemctl start waydroid-container`
2. Abrir UI: `waydroid show-full-ui`
3. En otra terminal, iniciar Metro:
   ```bash
   cd apps/mobile
   npx expo start --android
   ```
4. Descargar/install el development build:
   ```bash
   npx eas build --profile development --platform android
   adb install -r ruta-del.apk
   ```
5. La app carga desde Metro automáticamente.
```

---

## Testing & Verification

- [ ] `waydroid status` muestra contenedor corriendo.
- [ ] `free -h` mientras Waydroid corre muestra >2 GB disponibles (no OOM).
- [ ] APK de EAS Build se instala en Waydroid sin error.
- [ ] App Rhynode Finance abre y conecta a Metro.
- [ ] No quedan archivos `apps/mobile/android/` ni `EMULATOR_RAM_GUIDE.md`.
- [ ] `~/.bashrc` no exporta ANDROID_HOME.
- [ ] `~/Android/Sdk`, `~/.android/avd`, `~/.gradle` eliminados.

---

## Spec Coverage

- Waydroid como emulador local: Tasks 1, 2, 3.
- Limpieza de Android Studio/Gradle/AVD: Task 5.
- Configuración de EAS Build para development APK: Task 4.
- Verificación visual: Task 6.
- Documentación: Task 7.
