#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")" && pwd)
printf '==> Validating schemas...\n'
glib-compile-schemas --strict --dry-run "$ROOT/schemas"

printf '==> Building zip...\n'
"$ROOT/build.sh"

if command -v gnome-extensions >/dev/null 2>&1; then
  printf '==> gnome-extensions validate...\n'
  gnome-extensions validate "$ROOT/dist"/clipboardpopup@local.zip || true
else
  printf '==> gnome-extensions not found; skipped validate.\n'
fi

printf 'Done.\n'
