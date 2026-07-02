#!/usr/bin/env bash
set -euo pipefail

# Instala el APK release de Rhynode Finance en un Android conectado por USB.
# Requiere adb y depuración USB habilitada en el dispositivo.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APK="${SCRIPT_DIR}/app-release-arm64.apk"
ADB="${ANDROID_HOME:-/home/juan-daniel/Android/Sdk}/platform-tools/adb"

if [[ ! -f "$APK" ]]; then
  echo "Error: APK no encontrado en ${APK}" >&2
  exit 1
fi

echo "Esperando dispositivo Android..."
"$ADB" wait-for-device

echo "Instalando Rhynode Finance..."
"$ADB" install -r "$APK"

echo "Listo. Abre 'Rhynode' en tu teléfono."
