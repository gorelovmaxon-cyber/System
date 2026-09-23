#!/usr/bin/env bash
set -euo pipefail

# Полное удаление System2 hooks из всех источников: global hooksPath, local hooksPath,
# прямой .git/hooks/post-commit. Чужие hooks сохраняются.

ROOT="$(git rev-parse --show-toplevel)"
TEMPLATES="$ROOT/.git-hooks-templates"
MARKER="System2 event queue capture"

same_path() {
  node -e '
    const path = require("node:path"), fs = require("node:fs");
    const norm = value => { try { return fs.realpathSync.native(value); } catch { return path.resolve(value); } };
    const [left, right] = process.argv.slice(1).map(norm);
    const equal = process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
    process.exit(equal ? 0 : 1);
  ' "$1" "$2"
}

is_our_hook() {
  local file="$1"
  [ -f "$file" ] && grep -qF "$MARKER" "$file"
}

CHANGES=0

# 1. Проверить global hooksPath
GLOBAL_HOOKS="$(git config --global --get core.hooksPath 2>/dev/null || true)"
if [ -n "$GLOBAL_HOOKS" ]; then
  GLOBAL_EFFECTIVE="$(git config --global --path-format=absolute --get core.hooksPath 2>/dev/null || echo "$GLOBAL_HOOKS")"
  if same_path "$GLOBAL_EFFECTIVE" "$TEMPLATES" 2>/dev/null; then
    git config --global --unset core.hooksPath
    echo "Unset global core.hooksPath (was $GLOBAL_HOOKS)."
    CHANGES=$((CHANGES + 1))
  fi
fi

# 2. Проверить local hooksPath
LOCAL_HOOKS="$(git config --local --get core.hooksPath 2>/dev/null || true)"
if [ -n "$LOCAL_HOOKS" ]; then
  LOCAL_EFFECTIVE="$(git rev-parse --path-format=absolute --git-path hooks 2>/dev/null || true)"
  if [ -n "$LOCAL_EFFECTIVE" ] && same_path "$LOCAL_EFFECTIVE" "$TEMPLATES"; then
    git config --local --unset core.hooksPath
    echo "Unset local core.hooksPath (was $LOCAL_HOOKS)."
    CHANGES=$((CHANGES + 1))
  fi
fi

# 3. Проверить прямой .git/hooks/post-commit
DIRECT_HOOK="$ROOT/.git/hooks/post-commit"
if is_our_hook "$DIRECT_HOOK"; then
  rm "$DIRECT_HOOK"
  echo "Removed System2 .git/hooks/post-commit."
  CHANGES=$((CHANGES + 1))
elif [ -f "$DIRECT_HOOK" ]; then
  echo "WARNING: .git/hooks/post-commit exists but is not recognized as System2. Left unchanged." >&2
fi

if [ "$CHANGES" -eq 0 ]; then
  echo "No System2 hooks found; nothing to uninstall."
  exit 0
fi

echo "Removed $CHANGES System2 hook(s). Existing captured queue history is left as inactive, not deleted."
