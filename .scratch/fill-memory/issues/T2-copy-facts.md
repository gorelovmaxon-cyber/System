# T2 — Перенести facts из D:\System\memory в .claude/memory

**What to build:** Скопировать файлы фактов из `D:\System\memory/facts/` в `.claude/memory/facts/` с сохранением содержимого

**Blocked by:** none

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `D:\System2` (File > Open Folder).

## Контекст

В `D:\System\memory/facts/` есть факты о проектах и технологиях, которые нужно перенести в `.claude/memory/facts/` для глобальной памяти.

## Файлы для чтения (контекст)

- [D:\System\memory\facts\projects-overview.md](D:\System\memory\facts\projects-overview.md) — обзор проектов
- [D:\System\memory\facts\technology-stack.md](D:\System\memory\facts\technology-stack.md) — технологический стек

## Файлы для изменения

Нет — только копирование файлов.

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `D:\System\memory\*` — источник, НЕ изменять и НЕ удалять
- `.claude/memory/MEMORY.md` — обновим в T5

## Алгоритм (шаг за шагом)

1. **Проверь папку назначения:**
   ```bash
   ls -la .claude/memory/facts/
   ```

2. **Скопируй файлы:**
   ```bash
   cp /d/System/memory/facts/*.md .claude/memory/facts/
   ```

3. **Проверь копирование:**
   ```bash
   ls -la .claude/memory/facts/
   cat .claude/memory/facts/projects-overview.md | head -10
   ```
   Должно быть 2 файла.

4. **Проверь содержимое:**
   ```bash
   for f in .claude/memory/facts/*.md; do echo "=== $f ==="; head -5 "$f"; done
   ```

## Критерии приёмки

- [ ] 2 файла скопированы в `.claude/memory/facts/`
- [ ] Содержимое не изменено
- [ ] Исходники остались в D:\System

## Ограничения

- Использовать `cp`, не `mv`
- НЕ изменять содержимое

## Как закончить

1. Проверь:
   ```bash
   diff /d/System/memory/facts/projects-overview.md .claude/memory/facts/projects-overview.md
   ```

2. Коммит:
   ```bash
   git add .claude/memory/facts/
   git commit -m "feat(memory): add facts from D:\System\memory"
   ```

3. Финальный ответ:
   ```
   ✅ T2 готов
   Коммит: [hash]
   Скопировано: 2 файла в .claude/memory/facts/
   Файлы: projects-overview.md, technology-stack.md
   ```

---

**Команда проверки:** `ls -la .claude/memory/facts/`
