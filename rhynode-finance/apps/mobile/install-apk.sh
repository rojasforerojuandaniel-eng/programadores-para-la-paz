#!/usr/bin/env bash
set -euo pipefail

# Instala el APK release de Rhynode Finance en un Android conectado por USB.
# Requiere adb y depuración USB habilitada en el dispositivo.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ADB="${ANDROID_HOME:-/home/juan-daniel/Android/Sdk}/platform-tools/adb"

if [[ ! -x "$ADB" ]]; then
  echo "Error: adb no encontrado en ${ADB}" >&2
  echo "Define ANDROID_HOME o asegúrate de que adb esté en PATH." >&2
  exit 1
fi

echo "Esperando dispositivo Android..."
"$ADB" wait-for-device

# Asegurar que el dispositivo esté autorizado (no en 'unauthorized')
DEVICE_STATE=$("$ADB" get-state 2>/dev/null || true)
if [[ "$DEVICE_STATE" != "device" ]]; then
  echo "Error: dispositivo en estado '${DEVICE_STATE}'. Acepta el cuadro de diálogo de depuración USB en el teléfono." >&2
  exit 1
fi

# Detectar ABI primario del dispositivo
ABI=$("$ADB" shell getprop ro.product.cpu.abi | tr -d '[:space:]')
echo "Arquitectura del dispositivo: ${ABI}"

case "${ABI}" in
  arm64-v8a)
    APK="${SCRIPT_DIR}/app-release-arm64.apk"
    ;;
  armeabi-v7a)
    APK="${SCRIPT_DIR}/app-release-arm.apk"
    ;;
  x86_64)
    echo "Error: no hay APK release para x86_64. Construye uno o usa un dispositivo ARM." >&2
    exit 1
    ;;
  *)
    echo "Error: ABI '${ABI}' no soportada. Solo arm64-v8a y armeabi-v7a tienen APK release." >&2
    exit 1
    ;;
esac

if [[ ! -f "$APK" ]]; then
  echo "Error: APK no encontrado en ${APK}" >&2
  exit 1
fi

# Información de debug antes de instalar
APK_BASENAME=$(basename "$APK")
echo "APK seleccionado: ${APK_BASENAME}"
echo "Verificando firma y ABI del APK..."
BUILD_TOOLS=$(ls -d /home/juan-daniel/Android/Sdk/build-tools/* 2>/dev/null | sort -V | tail -1)
"${BUILD_TOOLS}/aapt" dump badging "$APK" | grep -E "package:|versionCode|versionName|native-code" || true

# Capturar package y versionCode para diagnóstico de fallos de instalación
APK_PACKAGE=$("${BUILD_TOOLS}/aapt" dump badging "$APK" | grep -oP "package: name='\K[^']+" || true)
APK_VERSION=$("${BUILD_TOOLS}/aapt" dump badging "$APK" | grep -oP "versionCode='\K[^']+" || true)
echo "Package: ${APK_PACKAGE:-desconocido}, versionCode: ${APK_VERSION:-desconocido}"

# Desinstalar versión previa si existe, para evitar conflictos de firma/versionCode.
# Esto borra datos locales de la app anterior.
if [[ -n "${APK_PACKAGE:-}" ]]; then
  echo "Desinstalando versión anterior de ${APK_PACKAGE} si existe..."
  "$ADB" uninstall "${APK_PACKAGE}" >/dev/null 2>&1 || true
fi

echo "Instalando Rhynode Finance desde ${APK_BASENAME}..."
if ! "$ADB" install -r "$APK"; then
  echo ""
  echo "Error: la instalación falló. Causas comunes:" >&2
  echo "  - ABI incompatible (ver arquitectura arriba)" >&2
  echo "  - Certificado diferente a la versión anterior (ahora se desinstala primero)" >&2
  echo "  - versionCode menor que la instalada" >&2
  echo "  - Depuración USB no autorizada" >&2
  echo "Revisa los logs con: adb logcat -d | grep -i rhynode" >&2
  exit 1
fi

echo ""
echo "Listo. Abre 'Rhynode' en tu teléfono."
echo "Para ver logs en vivo: adb logcat -s Rhynode:D ReactNative:V ReactNativeJS:V AndroidRuntime:E *:S"
