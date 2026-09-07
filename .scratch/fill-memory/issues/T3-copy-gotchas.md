# T3 — Перенести gotchas из D:\System\memory в .claude/memory

**What to build:** Скопировать файлы gotchas из `D:\System\memory/gotchas/` в `.claude/memory/gotchas/` с сохранением содержимого

**Blocked by:** none

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `D:\System2` (File > Open Folder).

## Контекст

В `D:\System\memory/gotchas/` есть известные проблемы и решения, которые нужно перенести в `.claude/memory/gotchas/` для глобальной памяти.

## Файлы для чтения (контекст)

- [D:\System\memory\gotchas\git-node-windows.md](D:\System\memory\gotchas\git-node-windows.md) — проблемы Git + Node.js на Windows

## Файлы для изменения

Нет — только копирование файлов.

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `D:\System\memory\*` — источник, НЕ изменять и НЕ удалять
- `.claude/memory/MEMORY.md` — обновим в T5

## Алгоритм (шаг за шагом)

1. **Проверь папку назначения:**
   ```bash
   ls -la .claude/memory/gotchas/
   ```

2. **Скопируй файлы:**
   ```bash
   cp /d/System/memory/gotchas/*.md .claude/memory/gotchas/
   ```

3. **Проверь копирование:**
   ```bash
   ls -la .claude/memory/gotchas/
   cat .claude/memory/gotchas/git-node-windows.md | head -10
   ```
   Должен быть минимум 1 файл.

4. **Проверь содержимое:**
   ```bash
   for f in .claude/memory/gotchas/*.md; do echo "=== $f ==="; head -5 "$f"; done
   ```

## Критерии приёмки

- [ ] Все файлы .md скопированы в `.claude/memory/gotchas/`
- [ ] Содержимое не изменено
- [ ] Исходники остались в D:\System

## Ограничения

- Использовать `cp`, не `mv`
- НЕ изменять содержимое

## Как закончить

1. Проверь:
   ```bash
   diff /d/System/memory/gotchas/git-node-windows.md .claude/memory/gotchas/git-node-windows.md
   ```

2. Коммит:
   ```bash
   git add .claude/memory/gotchas/
   git commit -m "feat(memory): add gotchas from D:\System\memory"
   ```

3. Финальный ответ:
   ```
   ✅ T3 готов
   Коммит: [hash]
   Скопировано: [N] файлов в .claude/memory/gotchas/
   Файлы: git-node-windows.md [и другие если есть]
   ```

---

**Команда проверки:** `ls -la .claude/memory/gotchas/`
