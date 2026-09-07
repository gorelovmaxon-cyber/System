# T5 — Обновить MEMORY.md индекс со всеми файлами

**What to build:** Обновить `.claude/memory/MEMORY.md` добавив ссылки на все скопированные файлы из patterns, facts, gotchas, decisions

**Blocked by:** T1, T2, T3, T4

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `D:\System2` (File > Open Folder).

## Контекст

После копирования всех файлов памяти из D:\System нужно обновить индекс `.claude/memory/MEMORY.md`, добавив ссылки на все новые файлы. Сейчас там только user-profile, нужно добавить остальное.

## Файлы для изменения

- [.claude/memory/MEMORY.md](.claude/memory/MEMORY.md) — добавить ссылки на все файлы

## Файлы для чтения (контекст)

- [.claude/memory/patterns/](.claude/memory/patterns/) — проверить какие файлы там (T1)
- [.claude/memory/facts/](.claude/memory/facts/) — проверить какие файлы там (T2)
- [.claude/memory/gotchas/](.claude/memory/gotchas/) — проверить какие файлы там (T3)
- [.claude/memory/decisions/](.claude/memory/decisions/) — проверить какие файлы там (T4)

## ⚠️ Файлы НЕЛЬЗЯ трогать

- Все файлы в подпапках — только читать для составления индекса

## Алгоритм (шаг за шагом)

1. **Прочитай текущий MEMORY.md:**
   ```bash
   cat .claude/memory/MEMORY.md
   ```

2. **Посмотри какие файлы есть в каждой папке:**
   ```bash
   ls -1 .claude/memory/patterns/*.md
   ls -1 .claude/memory/facts/*.md
   ls -1 .claude/memory/gotchas/*.md
   ls -1 .claude/memory/decisions/*.md
   ```

3. **Обнови MEMORY.md — замени секции "будет заполняться" на реальные ссылки:**

   Найди секцию:
   ```markdown
   ## Patterns (Что работает хорошо)
   *(будет заполняться через auto-learn)*
   ```
   
   Замени на:
   ```markdown
   ## Patterns (Что работает хорошо)
   - [Model Separation by Cognitive Load](patterns/model-separation-by-cognitive-load.md) — Opus думает, Sonnet/Qwen реализует
   - [Explicit Stop Gates](patterns/explicit-stop-gates.md) — явные остановки между фазами
   - [Sequential Subagent Pipeline](patterns/sequential-subagent-pipeline.md) — 1 тикет = 1 агент = 1 коммит
   ```

4. **Обнови секцию Facts:**

   Найди:
   ```markdown
   ## Facts (Данные о проектах и технологиях)
   *(будет заполняться через auto-learn)*
   ```
   
   Замени на:
   ```markdown
   ## Facts (Данные о проектах и технологиях)
   - [Technology Stack](facts/technology-stack.md) — языки, фреймворки, tools, APIs
   - [Projects Overview](facts/projects-overview.md) — активные проекты, статус, эволюция систем
   ```

5. **Обнови секцию Gotchas:**

   Найди:
   ```markdown
   ## Gotchas (Ошибки и workarounds)
   *(будет заполняться через auto-learn)*
   ```
   
   Замени на:
   ```markdown
   ## Gotchas (Ошибки и workarounds)
   - [Git + Node.js на Windows](gotchas/git-node-windows.md) — типичные проблемы и решения
   ```

6. **Обнови секцию Decisions:**

   Найди:
   ```markdown
   ## Decisions (Принятые архитектурные решения)
   *(будет заполняться через auto-learn)*
   ```
   
   Замени на:
   ```markdown
   ## Decisions (Принятые архитектурные решения)
   - [2026-08-17: SystemQwen Architecture](decisions/2026-08-17-systemqwen-architecture.md) — гибридная система Opus+Qwen
   - [2026-08-18: SystemQwen Этап 1 Completion](decisions/2026-08-18-systemqwen-etap1-completion.md) — завершение фундамента
   ```

7. **Обнови дату в footer:**
   
   Найди:
   ```markdown
   **Последнее обновление:** 2026-08-18  
   **Структура:** относительные пути для переносимости между машинами
   ```
   
   Оставь без изменений или обнови дату на текущую.

8. **Проверь финальный файл:**
   ```bash
   cat .claude/memory/MEMORY.md
   ```

## Критерии приёмки

- [ ] Секция "Patterns" содержит 3 ссылки (не "будет заполняться")
- [ ] Секция "Facts" содержит 2 ссылки
- [ ] Секция "Gotchas" содержит минимум 1 ссылку
- [ ] Секция "Decisions" содержит 2 ссылки
- [ ] Секция "User Profile" осталась без изменений (4 файла)
- [ ] Все ссылки относительные (patterns/..., facts/..., etc)

## Ограничения

- НЕ изменять секцию "User Profile"
- Использовать ТОЛЬКО относительные пути
- Сохранить структуру markdown (заголовки, списки)

## Как закончить

1. Проверь ссылки:
   ```bash
   grep -E "\[.*\]\(.*\.md\)" .claude/memory/MEMORY.md | wc -l
   ```
   Должно быть минимум 11 ссылок (4 user-profile + 3 patterns + 2 facts + 1 gotchas + 2 decisions).

2. Коммит:
   ```bash
   git add .claude/memory/MEMORY.md
   git commit -m "feat(memory): update MEMORY.md index with all imported files"
   ```

3. Финальный ответ:
   ```
   ✅ T5 готов
   Коммит: [hash]
   Обновлён: .claude/memory/MEMORY.md
   Добавлено ссылок: Patterns (3), Facts (2), Gotchas (1+), Decisions (2)
   Всего файлов в индексе: [N]
   ```

---

**Команда проверки:** `cat .claude/memory/MEMORY.md && grep -c "\.md)" .claude/memory/MEMORY.md`
