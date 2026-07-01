#!/usr/bin/env bash
set -euo pipefail

# Generate the production Android release keystore for Rhynode Finance.
# This script is intentionally NOT executed automatically; the keystore and
# its passwords are secrets that must be controlled by the project owner.
#
# Usage:
#   RHYNODE_RELEASE_STORE_PASSWORD='...' \
#   RHYNODE_RELEASE_KEY_PASSWORD='...' \
#   ./scripts/generate-android-keystore.sh
#
# Optional overrides:
#   RHYNODE_RELEASE_STORE_FILE (default: rhynode-release.keystore)
#   RHYNODE_RELEASE_KEY_ALIAS  (default: rhynode)
#   RHYNODE_RELEASE_STORE_DIR  (default: apps/mobile/android/app)

: "${RHYNODE_RELEASE_STORE_FILE:=rhynode-release.keystore}"
: "${RHYNODE_RELEASE_KEY_ALIAS:=rhynode}"
: "${RHYNODE_RELEASE_STORE_DIR:=apps/mobile/android/app}"

if [[ -z "${RHYNODE_RELEASE_STORE_PASSWORD:-}" ]]; then
  echo "Error: RHYNODE_RELEASE_STORE_PASSWORD is required." >&2
  exit 1
fi

if [[ -z "${RHYNODE_RELEASE_KEY_PASSWORD:-}" ]]; then
  echo "Error: RHYNODE_RELEASE_KEY_PASSWORD is required." >&2
  exit 1
fi

mkdir -p "${RHYNODE_RELEASE_STORE_DIR}"
store_path="${RHYNODE_RELEASE_STORE_DIR}/${RHYNODE_RELEASE_STORE_FILE}"

if [[ -f "${store_path}" ]]; then
  echo "Error: keystore already exists at ${store_path}; refusing to overwrite." >&2
  exit 1
fi

echo "Generating production keystore at ${store_path}..."
keytool -genkey -v \
  -keystore "${store_path}" \
  -alias "${RHYNODE_RELEASE_KEY_ALIAS}" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "${RHYNODE_RELEASE_STORE_PASSWORD}" \
  -keypass "${RHYNODE_RELEASE_KEY_PASSWORD}" \
  -dname "CN=Rhynode Finance, OU=Rhynode, O=Rhynode, L=Bogota, C=CO"

echo ""
echo "Keystore created: ${store_path}"
echo ""
echo "NEXT STEPS:"
echo "1. Add the keystore and these credentials to EAS (do NOT commit them):"
echo "   eas credentials"
echo "2. For local release builds, set the environment variables or uncomment and fill"
echo "   the placeholders in apps/mobile/android/gradle.properties in a non-committed override."
echo "3. Ensure *.keystore and *.jks are ignored by git (already configured)."
