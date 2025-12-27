#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")" && pwd)
UUID="clipboardpopup@local"
BUILD_DIR="$ROOT/dist"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

glib-compile-schemas "$ROOT/schemas"

ZIP="$BUILD_DIR/${UUID}.zip"
# shellcheck disable=SC2046
zip -r "$ZIP" $(cd "$ROOT" && ls -1) \
    -x "dist" "dist/*" \
    -x "*.zip" \
    -x "*.swp" "*.tmp"

echo "Built $ZIP"
