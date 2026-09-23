#!/usr/bin/env bash
set -euo pipefail

# Полное удаление System2 hooks из всех источников: global hooksPath, local hooksPath,
# прямой .git/hooks/post-commit. Чужие hooks сохраняются.

ROOT="$(git rev-parse --show-toplevel)"
TEMPLATES="$ROOT/.git-hooks-templates"
MARKER="System2 portable post-commit hook"

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

is_mixed_hook() {
  local file="$1"
  if [ ! -f "$file" ]; then
    return 1
  fi
  if ! grep -qF "$MARKER" "$file"; then
    return 1
  fi
  # Наш маркер есть. Смешанный = файл отличается от эталонного шаблона
  # (дописанный или изменённый пользовательский код).
  if cmp -s "$file" "$TEMPLATES/post-commit"; then
    return 1
  fi
  return 0
}

CHANGES=0

# 1. Проверить global hooksPath
GLOBAL_HOOKS="$(git config --global --get core.hooksPath 2>/dev/null || true)"
if [ -n "$GLOBAL_HOOKS" ]; then
  GLOBAL_EFFECTIVE="$(git config --global --type=path --get core.hooksPath 2>/dev/null || echo "$GLOBAL_HOOKS")"
  if same_path "$GLOBAL_EFFECTIVE" "$TEMPLATES" 2>/dev/null; then
    echo "WARNING: global core.hooksPath points to this System2 ($GLOBAL_HOOKS)." >&2
    echo "         This affects all repositories. To remove it, run manually:" >&2
    echo "         git config --global --unset core.hooksPath" >&2
    echo "         Skipping automatic removal." >&2
  fi
fi

# 2. Проверить local hooksPath
LOCAL_HOOKS="$(git config --local --get core.hooksPath 2>/dev/null || true)"
if [ -n "$LOCAL_HOOKS" ]; then
  LOCAL_EFFECTIVE="$(git config --local --type=path --get core.hooksPath 2>/dev/null || echo "$LOCAL_HOOKS")"
  if same_path "$LOCAL_EFFECTIVE" "$TEMPLATES" 2>/dev/null; then
    git config --local --unset core.hooksPath
    echo "Unset local core.hooksPath (was $LOCAL_HOOKS)."
    CHANGES=$((CHANGES + 1))
  fi
fi

# 3. Проверить прямой .git/hooks/post-commit
DIRECT_HOOK="$ROOT/.git/hooks/post-commit"
if is_mixed_hook "$DIRECT_HOOK"; then
  echo "WARNING: .git/hooks/post-commit contains System2 marker AND other code (mixed hook)." >&2
  echo "         Manual cleanup required. Not removing automatically to preserve your code." >&2
elif is_our_hook "$DIRECT_HOOK"; then
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
