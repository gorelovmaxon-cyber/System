# T4 — Перенести decisions из D:\System\memory в .claude/memory

**What to build:** Скопировать файлы decisions из `D:\System\memory/decisions/` в `.claude/memory/decisions/` с сохранением содержимого

**Blocked by:** none

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `D:\System2` (File > Open Folder).

## Контекст

В `D:\System\memory/decisions/` есть архитектурные решения, которые нужно перенести в `.claude/memory/decisions/` для глобальной памяти. Уже есть один файл `2026-08-18-systemqwen-etap1-completion.md`, добавим остальные.

## Файлы для чтения (контекст)

- [D:\System\memory\decisions\2026-08-17-systemqwen-architecture.md](D:\System\memory\decisions\2026-08-17-systemqwen-architecture.md) — решение об архитектуре SystemQwen

## Файлы для изменения

Нет — только копирование файлов.

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `D:\System\memory\*` — источник, НЕ изменять и НЕ удалять
- `.claude/memory/decisions/2026-08-18-systemqwen-etap1-completion.md` — уже существует, НЕ перезаписывать
- `.claude/memory/MEMORY.md` — обновим в T5

## Алгоритм (шаг за шагом)

1. **Проверь папку назначения:**
   ```bash
   ls -la .claude/memory/decisions/
   ```
   Должен быть 1 файл: `2026-08-18-systemqwen-etap1-completion.md`

2. **Скопируй файлы (НЕ перезаписывая существующие):**
   ```bash
   cp -n /d/System/memory/decisions/*.md .claude/memory/decisions/
   ```
   Флаг `-n` (no-clobber) не перезаписывает существующие файлы.

3. **Проверь копирование:**
   ```bash
   ls -la .claude/memory/decisions/
   cat .claude/memory/decisions/2026-08-17-systemqwen-architecture.md | head -10
   ```
   Должно быть минимум 2 файла.

4. **Проверь что существующий файл не изменился:**
   ```bash
   git diff .claude/memory/decisions/2026-08-18-systemqwen-etap1-completion.md
   ```
   Должно быть пусто (не изменён).

## Критерии приёмки

- [ ] Новые файлы скопированы в `.claude/memory/decisions/`
- [ ] Существующий файл `2026-08-18-systemqwen-etap1-completion.md` НЕ изменён
- [ ] Содержимое новых файлов не изменено
- [ ] Исходники остались в D:\System

## Ограничения

- Использовать `cp -n` (не перезаписывать существующие)
- НЕ изменять содержимое
- НЕ трогать `2026-08-18-systemqwen-etap1-completion.md`

## Как закончить

1. Проверь:
   ```bash
   diff /d/System/memory/decisions/2026-08-17-systemqwen-architecture.md .claude/memory/decisions/2026-08-17-systemqwen-architecture.md
   git status .claude/memory/decisions/
   ```

2. Коммит:
   ```bash
   git add .claude/memory/decisions/
   git commit -m "feat(memory): add decisions from D:\System\memory"
   ```

3. Финальный ответ:
   ```
   ✅ T4 готов
   Коммит: [hash]
   Скопировано: [N] новых файлов в .claude/memory/decisions/
   Файлы: 2026-08-17-systemqwen-architecture.md [и другие если есть]
   Не изменён: 2026-08-18-systemqwen-etap1-completion.md
   ```

---

**Команда проверки:** `ls -la .claude/memory/decisions/ && wc -l .claude/memory/decisions/*.md`
