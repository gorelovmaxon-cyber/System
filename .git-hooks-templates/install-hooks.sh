#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
TEMPLATES="$ROOT/.git-hooks-templates"

# Эффективный каталог hooks вычисляет сам Git, а не строка "$ROOT/.git/hooks":
# без core.hooksPath это общий hooks каталог common git-dir (в linked worktree
# он один на все деревья), с относительным core.hooksPath — свой каталог на
# каждое дерево. В worktree `.git` — файл, поэтому собранный руками путь
# не находил пользовательский hook в общем каталоге и молча его отключал (G11).
EFFECTIVE_HOOKS="$(git rev-parse --path-format=absolute --git-path hooks 2>/dev/null || true)"

FORCE=false
for arg in "$@"; do
  [ "$arg" = "--force" ] && FORCE=true
done

same_path() {
  node -e '
    const path = require("node:path"), fs = require("node:fs");
    const norm = value => { try { return fs.realpathSync.native(value); } catch { return path.resolve(value); } };
    const [left, right] = process.argv.slice(1).map(norm);
    const equal = process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
    process.exit(equal ? 0 : 1);
  ' "$1" "$2"
}

is_our_template() {
  node -e '
    const fs = require("node:fs");
    const read = value => fs.readFileSync(value, "utf8").replace(/\r\n/g, "\n");
    process.exit(read(process.argv[1]) === read(process.argv[2]) ? 0 : 1);
  ' "$1" "$TEMPLATES/post-commit"
}

# Молчаливая установка без шаблона оставила бы hooksPath, указывающий в пустоту:
# hook не выполнялся бы, а установщик сообщал бы об успехе.
if [ ! -f "$TEMPLATES/post-commit" ]; then
  echo "Hook template is missing: $TEMPLATES/post-commit; this worktree does not have it checked out. Nothing was changed." >&2
  exit 1
fi

ACTIVE_ORIGIN="$(git config --show-origin --get core.hooksPath 2>/dev/null || true)"
ACTIVE="${ACTIVE_ORIGIN#*$'\t'}"

if [ -n "$ACTIVE" ]; then
  if same_path "$EFFECTIVE_HOOKS" "$TEMPLATES"; then
    echo "hooksPath already points to $TEMPLATES (${ACTIVE_ORIGIN%%$'\t'*}, $ACTIVE)"
    exit 0
  fi
  echo "Existing active core.hooksPath is $ACTIVE; it was not changed. Merge/chain hooks explicitly before switching." >&2
  exit 2
fi

USER_HOOK="$EFFECTIVE_HOOKS/post-commit"
if [ -f "$USER_HOOK" ] && ! is_our_template "$USER_HOOK"; then
  if [ "$FORCE" != true ]; then
    echo "Existing user hook found at $USER_HOOK; rerun with --force to back it up and switch hooksPath." >&2
    exit 2
  fi
  BACKUP="$USER_HOOK.backup-$(date +%Y%m%d%H%M%S)"
  cp -p "$USER_HOOK" "$BACKUP"
  echo "Backed up existing hook to $BACKUP"
fi

node -e "const f=process.argv[1],fs=require('node:fs');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/\\r\\n/g,'\\n'))" "$TEMPLATES/post-commit"
if type chmod >/dev/null 2>&1; then
  chmod +x "$TEMPLATES/post-commit"
fi

# Относительный путь, а не абсолютный: Git разрешает его от вершины рабочего
# дерева, поэтому установка переживает перенос и удаление worktree, а в каждом
# worktree, где шаблоны выложены, включается свой hooks каталог.
git -C "$ROOT" config core.hooksPath .git-hooks-templates

EFFECTIVE_AFTER="$(git rev-parse --path-format=absolute --git-path hooks 2>/dev/null || true)"
if ! same_path "$EFFECTIVE_AFTER" "$TEMPLATES" || [ ! -f "$EFFECTIVE_AFTER/post-commit" ]; then
  echo "Installation did not take effect: effective hooks path is $EFFECTIVE_AFTER" >&2
  exit 1
fi
echo "Installed hooksPath: .git-hooks-templates (effective: $EFFECTIVE_AFTER)"
