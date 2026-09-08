#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
FORCE=false
for arg in "$@"; do
  [ "$arg" = "--force" ] && FORCE=true
done
TARGET="$ROOT/.git-hooks-templates"
LEGACY="$ROOT/.git/hooks/post-commit"
ACTIVE="$(git config --get core.hooksPath 2>/dev/null || true)"

if [ "$ACTIVE" = ".git-hooks-templates" ] || [ "$ACTIVE" = "$TARGET" ]; then
  echo "hooksPath already points to $TARGET"
  exit 0
fi

if [ -f "$LEGACY" ]; then
  if [ "$FORCE" != true ]; then
    echo "Existing user hook found at $LEGACY; rerun with --force to back it up and switch hooksPath." >&2
    exit 2
  fi
  BACKUP="$LEGACY.backup-$(date +%Y%m%d%H%M%S)"
  cp -p "$LEGACY" "$BACKUP"
  echo "Backed up existing hook to $BACKUP"
fi

if type chmod >/dev/null 2>&1; then
  chmod +x "$TARGET/post-commit"
fi
git -C "$ROOT" config core.hooksPath .git-hooks-templates
echo "Installed portable hooksPath: .git-hooks-templates"
