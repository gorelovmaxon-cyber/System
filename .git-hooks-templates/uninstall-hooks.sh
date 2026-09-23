#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
TEMPLATES="$ROOT/.git-hooks-templates"

# Тот же принцип, что у install-hooks.sh: эффективный каталог hooks вычисляет
# сам Git, а не собранный вручную путь (иначе linked worktree с общим
# hooks-каталогом не распознаётся, см. install-hooks.sh, G11).
EFFECTIVE_HOOKS="$(git rev-parse --path-format=absolute --git-path hooks 2>/dev/null || true)"

same_path() {
  node -e '
    const path = require("node:path"), fs = require("node:fs");
    const norm = value => { try { return fs.realpathSync.native(value); } catch { return path.resolve(value); } };
    const [left, right] = process.argv.slice(1).map(norm);
    const equal = process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
    process.exit(equal ? 0 : 1);
  ' "$1" "$2"
}

ACTIVE_ORIGIN="$(git config --show-origin --get core.hooksPath 2>/dev/null || true)"
ACTIVE="${ACTIVE_ORIGIN#*$'\t'}"

if [ -z "$ACTIVE" ]; then
  echo "core.hooksPath is not set; nothing to uninstall."
  exit 0
fi

# Снимаем hooksPath только если он реально указывает на наши шаблоны в этом
# репозитории. Чужой путь (пользовательский hooks каталог, другой инструмент)
# не трогаем ни при каком профиле — иначе выключение System2-захвата тихо
# выключило бы посторонний hook.
if ! same_path "$EFFECTIVE_HOOKS" "$TEMPLATES"; then
  echo "Active core.hooksPath ($ACTIVE) is not $TEMPLATES; left unchanged." >&2
  exit 2
fi

git -C "$ROOT" config --unset core.hooksPath

AFTER="$(git config --get core.hooksPath 2>/dev/null || true)"
if [ -n "$AFTER" ]; then
  echo "Failed to unset core.hooksPath; it still reports: $AFTER" >&2
  exit 1
fi
echo "Unset core.hooksPath (was $TEMPLATES). Existing captured queue history is left as inactive, not deleted."
