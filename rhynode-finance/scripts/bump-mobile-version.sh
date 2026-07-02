#!/usr/bin/env bash
set -euo pipefail

# Bump the mobile app version across package.json, app.json and Android build.gradle.
# Usage: ./scripts/bump-mobile-version.sh [patch|minor|major]
# Default: patch

BUMP_TYPE="${1:-patch}"
if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="${ROOT_DIR}/apps/mobile"
PACKAGE_JSON="${MOBILE_DIR}/package.json"
APP_JSON="${MOBILE_DIR}/app.json"
BUILD_GRADLE="${MOBILE_DIR}/android/app/build.gradle"

CURRENT_VERSION="$(jq -r '.version' "$PACKAGE_JSON")"
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

case "$BUMP_TYPE" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

# Android versionCode: keep a simple incrementing integer based on the semver parts.
# This preserves monotonic growth needed by Google Play.
NEW_VERSION_CODE=$((MAJOR * 1000000 + MINOR * 1000 + PATCH))

echo "Bumping mobile version: ${CURRENT_VERSION} -> ${NEW_VERSION} (versionCode ${NEW_VERSION_CODE})"

# package.json
jq --arg v "$NEW_VERSION" '.version = $v' "$PACKAGE_JSON" > "${PACKAGE_JSON}.tmp"
mv "${PACKAGE_JSON}.tmp" "$PACKAGE_JSON"

# app.json
jq --arg v "$NEW_VERSION" '.expo.version = $v' "$APP_JSON" > "${APP_JSON}.tmp"
mv "${APP_JSON}.tmp" "$APP_JSON"

# build.gradle versionCode and versionName
if [[ -f "$BUILD_GRADLE" ]]; then
  sed -i \
    -e "s/versionCode [0-9]\+/versionCode ${NEW_VERSION_CODE}/" \
    -e "s/versionName \"[0-9.]*\"/versionName \"${NEW_VERSION}\"/" \
    "$BUILD_GRADLE"
fi

echo "Updated:"
echo "  ${PACKAGE_JSON} -> ${NEW_VERSION}"
echo "  ${APP_JSON} -> ${NEW_VERSION}"
echo "  ${BUILD_GRADLE} -> versionCode ${NEW_VERSION_CODE}, versionName ${NEW_VERSION}"
