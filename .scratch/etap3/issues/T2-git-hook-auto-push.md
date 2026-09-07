# T2 — Git hook: auto-push памяти после коммита

**What to build:** Шаблон post-commit hook + инструкция установки — автоматически пушит `.claude/memory/` на GitHub после каждого коммита в System2.

**Blocked by:** none

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `D:\System2` (File > Open Folder).

## Контекст

Сейчас push памяти делается вручную. Нужен post-commit hook который после каждого коммита автоматически делает `git push origin master` чтобы память всегда была на GitHub.

## Файлы для изменения

- [.git-hooks-templates/post-commit](.git-hooks-templates/post-commit) — создать новый файл (шаблон)
- [.git-hooks-templates/install-hooks.sh](.git-hooks-templates/install-hooks.sh) — создать скрипт установки
- [.gitignore](.gitignore) — НЕ добавлять hooks в gitignore (они должны быть в repo)

## Файлы для чтения (контекст)

- [CLAUDE.md](CLAUDE.md) — секция "Правило памяти" — понять зачем это нужно
- [.gitignore](.gitignore) — проверить что там уже есть

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `.git/hooks/` — напрямую не трогать, только через install-hooks.sh
- `.claude/memory/` — только читать для понимания структуры

## Алгоритм (шаг за шагом)

1. **Создать папку `.git-hooks-templates/`** в корне D:\System2

2. **Создать `.git-hooks-templates/post-commit`** с содержимым:
```bash
#!/bin/bash
# SystemQwen: auto-push memory to GitHub after every commit
# Установка: скопировать в .git/hooks/post-commit и дать chmod +x

# Пушить только если есть remote origin
if ! git remote get-url origin > /dev/null 2>&1; then
  exit 0
fi

# Пушить в фоне (не блокировать терминал)
git push origin master > /dev/null 2>&1 &

exit 0
```

3. **Создать `.git-hooks-templates/install-hooks.sh`** с содержимым:
```bash
#!/bin/bash
# Установка git hooks для SystemQwen
# Запуск: bash .git-hooks-templates/install-hooks.sh

HOOKS_DIR=".git/hooks"
TEMPLATES_DIR=".git-hooks-templates"

echo "Устанавливаю SystemQwen git hooks..."

cp "$TEMPLATES_DIR/post-commit" "$HOOKS_DIR/post-commit"
chmod +x "$HOOKS_DIR/post-commit"

echo "✅ post-commit hook установлен"
echo "   Теперь после каждого git commit память автоматически пушится на GitHub"
```

4. **Установить hook прямо сейчас** (выполнить в терминале):
```bash
bash .git-hooks-templates/install-hooks.sh
```

## Критерии приёмки

- [ ] `.git-hooks-templates/post-commit` создан с правильным содержимым
- [ ] `.git-hooks-templates/install-hooks.sh` создан
- [ ] Hook установлен: файл `.git/hooks/post-commit` существует
- [ ] Hook исполняемый: `ls -la .git/hooks/post-commit` показывает `-rwxr-xr-x`

## Как закончить

1. Проверить установку:
   ```bash
   ls -la .git/hooks/post-commit
   cat .git/hooks/post-commit
   ```
2. Коммит:
   ```bash
   git add .git-hooks-templates/
   git commit -m "T2: add auto-push git hook for memory sync"
   git push
   ```
3. Финальный ответ:
   - Файлы созданы
   - Hook установлен (да/нет)
   - Результат проверки ls
