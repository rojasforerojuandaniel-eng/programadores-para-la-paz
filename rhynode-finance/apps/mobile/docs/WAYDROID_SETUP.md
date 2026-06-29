# Correr Rhynode Finance en Waydroid (sin Android Studio)

> Reemplazo del emulador Android Studio, que colapsaba por falta de RAM (~7 GB físicos), por Waydroid: un contenedor LXC con Android real que consume <1 GB en reposo.

## Requisitos del sistema

- Ubuntu/Pop!_OS con sesión **Wayland** (`echo $XDG_SESSION_TYPE` → `wayland`).
- Kernel con módulo `binder_linux`:
  ```bash
  sudo modprobe binder_linux devices="binder,hwbinder,vndbinder"
  ```
- Virtualización CPU (KVM/VMX/SVM) habilitada.

## Instalación de Waydroid

```bash
curl -s https://repo.waydro.id | sudo bash -s resolute
sudo apt update
sudo apt install -y waydroid android-tools-adb
sudo waydroid init
sudo systemctl enable --now waydroid-container
```

## Arrancar Android

```bash
waydroid show-full-ui
```

En otra terminal, verifica estado y RAM:

```bash
waydroid status
free -h
```

## Construir e instalar la app

Rhynode Finance usa native modules (Clerk, SQLite, notificaciones, cámara), por lo que **no funciona en Expo Go**. Se requiere un **development build** vía EAS Build.

### 1. Autenticarte en EAS

```bash
cd apps/mobile
pnpm dlx eas-cli@latest login
```

Sigue las instrucciones del navegador.

### 2. Generar development build (APK)

```bash
pnpm dlx eas-cli@latest build --profile development --platform android
```

Descarga el APK cuando termine.

### 3. Instalar en Waydroid

```bash
adb connect $(waydroid status | grep IP | awk '{print $2}'):5555
adb install -r ruta/del/Rhynode-*.apk
```

### 4. Iniciar Metro

```bash
cd apps/mobile
export NODE_OPTIONS="--max-old-space-size=1536"
npx expo start --android
```

La app cargará el bundle desde Metro y mostrará la interfaz real de Android.

## Limpieza realizada

Se eliminaron del sistema y del repo:

- `apps/mobile/android/` (recreable con EAS Build)
- `apps/mobile/EMULATOR_RAM_GUIDE.md`
- `~/Android/Sdk`, `~/.android/avd`, `~/.gradle`
- Entradas de `~/.bashrc` para `ANDROID_HOME`
- Snap `android-studio`

## Alternativas si no quieres autenticarte en EAS

- **Modo web de Expo** (`npx expo start --web`): solo para revisar UI/layout; no simula Android ni soporta native modules.
- **Dispositivo Android físico**: conectar por USB y usar `npx expo start --android` con un development build.
