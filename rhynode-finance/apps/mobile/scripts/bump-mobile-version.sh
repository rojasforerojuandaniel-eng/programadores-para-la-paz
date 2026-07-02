#!/usr/bin/env bash
set -euo pipefail

# bump-mobile-version.sh
# Syncs the mobile version across package.json, app.json and android/app/build.gradle.
# Usage:
#   ./scripts/bump-mobile-version.sh           # sync only
#   ./scripts/bump-mobile-version.sh patch     # bump patch, then sync
#   ./scripts/bump-mobile-version.sh minor     # bump minor, then sync
#   ./scripts/bump-mobile-version.sh major     # bump major, then sync

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BUMP_TYPE="${1:-sync}"

if [[ "$BUMP_TYPE" != "sync" && "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  echo "Usage: $0 [sync|patch|minor|major]"
  exit 1
fi

if [[ "$BUMP_TYPE" != "sync" ]]; then
  echo "Bumping package.json version ($BUMP_TYPE)..."
  (cd "$MOBILE_DIR" && npm version "$BUMP_TYPE" --no-git-tag-version)
fi

VERSION="$(node -p "require('$MOBILE_DIR/package.json').version")"

# Turn semver into an Android versionCode.
# Formula: major*1000000 + minor*1000 + patch.
# Supports prerelease identifiers being ignored for the numeric code.
VERSION_CODE="$(node -e "
const [major, minor, patchWithPre] = '$VERSION'.split('.');
const patch = parseInt(patchWithPre.split('-')[0], 10);
console.log(parseInt(major,10)*1000000 + parseInt(minor,10)*1000 + patch);
")"

VERSION_NAME="$VERSION"

echo "Syncing version=$VERSION versionCode=$VERSION_NAME"

# Update app.json
node -e "
const fs = require('fs');
const path = '$MOBILE_DIR/app.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
data.expo.version = '$VERSION';
fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
"

# Update android/app/build.gradle
node -e "
const fs = require('fs');
const path = '$MOBILE_DIR/android/app/build.gradle';
let gradle = fs.readFileSync(path, 'utf8');
gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode $VERSION_CODE');
gradle = gradle.replace(/versionName\s+\"[^\"]+\"/, 'versionName \"$VERSION_NAME\"');
fs.writeFileSync(path, gradle);
"

echo "Done. package.json=$VERSION app.json=$VERSION gradle versionCode=$VERSION_CODE versionName=$VERSION_NAME"
