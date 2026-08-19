# T1 — Перенести patterns из D:\System\memory в .claude/memory

**What to build:** Скопировать все файлы паттернов из `D:\System\memory/patterns/` в `.claude/memory/patterns/` с сохранением содержимого

**Blocked by:** none

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `D:\System2` (File > Open Folder).

## Контекст

В `D:\System\memory/patterns/` есть готовые паттерны, которые нужно перенести в `.claude/memory/patterns/` для создания глобальной памяти. Это паттерны, собранные из анализа проектов.

## Файлы для чтения (контекст)

- [D:\System\memory\patterns\explicit-stop-gates.md](D:\System\memory\patterns\explicit-stop-gates.md) — паттерн явных остановок
- [D:\System\memory\patterns\model-separation-by-cognitive-load.md](D:\System\memory\patterns\model-separation-by-cognitive-load.md) — разделение моделей
- [D:\System\memory\patterns\sequential-subagent-pipeline.md](D:\System\memory\patterns\sequential-subagent-pipeline.md) — последовательный пайплайн

## Файлы для изменения

Нет — только копирование файлов.

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `D:\System\memory\*` — источник, НЕ изменять и НЕ удалять (только копировать)
- `.claude/memory/MEMORY.md` — обновим отдельно в T5

## Алгоритм (шаг за шагом)

1. **Проверь что папка назначения существует:**
   ```bash
   ls -la .claude/memory/patterns/
   ```

2. **Скопируй все файлы из D:\System\memory\patterns\ в .claude/memory/patterns\:**
   ```bash
   cp /d/System/memory/patterns/*.md .claude/memory/patterns/
   ```

3. **Проверь что файлы скопированы:**
   ```bash
   ls -la .claude/memory/patterns/
   cat .claude/memory/patterns/explicit-stop-gates.md | head -10
   ```
   Должно быть 3 файла.

4. **Проверь содержимое каждого файла (первые строки):**
   ```bash
   for f in .claude/memory/patterns/*.md; do echo "=== $f ==="; head -5 "$f"; done
   ```

## Критерии приёмки

- [ ] 3 файла скопированы в `.claude/memory/patterns/`
- [ ] Содержимое файлов не изменено (копия точная)
- [ ] Исходные файлы в `D:\System\memory\patterns\` остались без изменений

## Ограничения

- НЕ изменять содержимое файлов при копировании
- НЕ удалять исходные файлы из D:\System
- Использовать `cp`, не `mv`

## Как закончить

1. Проверь копирование:
   ```bash
   diff /d/System/memory/patterns/explicit-stop-gates.md .claude/memory/patterns/explicit-stop-gates.md
   ```
   Должно быть пусто (файлы идентичны).

2. Коммит:
   ```bash
   git add .claude/memory/patterns/
   git commit -m "feat(memory): add patterns from D:\System\memory"
   ```

3. Финальный ответ:
   ```
   ✅ T1 готов
   Коммит: [hash]
   Скопировано: 3 файла в .claude/memory/patterns/
   Файлы: explicit-stop-gates.md, model-separation-by-cognitive-load.md, sequential-subagent-pipeline.md
   ```

---

**Команда проверки:** `ls -la .claude/memory/patterns/ && wc -l .claude/memory/patterns/*.md`
