# T1 — Переместить user-profile и создать структуру памяти

**What to build:** Переместить `memory/user-profile/` в `.claude/memory/user-profile/` и создать полную структуру папок для централизованной памяти системы

**Blocked by:** none

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `D:\System2` (File > Open Folder).

## Контекст

Сейчас user-profile находится в `memory/user-profile/`, но все скиллы ожидают памятью в `.claude/memory/`. Нужно переместить user-profile и создать единую структуру памяти внутри `.claude/memory/`, чтобы при переносе папки System2 на другой ПК всё работало.

## Файлы для изменения

Нет файлов для изменения — только перемещение папок и создание структуры.

## Файлы для чтения (контекст)

- [memory/user-profile/coding-style.md](memory/user-profile/coding-style.md) — текущий профиль (будет перемещён)
- [memory/user-profile/architecture-prefs.md](memory/user-profile/architecture-prefs.md) — текущий профиль (будет перемещён)
- [memory/user-profile/common-mistakes.md](memory/user-profile/common-mistakes.md) — текущий профиль (будет перемещён)
- [memory/user-profile/work-patterns.md](memory/user-profile/work-patterns.md) — текущий профиль (будет перемещён)

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `memory/user-profile/*.md` — НЕ изменять содержимое файлов, только переместить их целиком
- `.claude/skills/` — не трогать скиллы в этом тикете (обновим в T3, T4)

## Алгоритм (шаг за шагом)

1. **Проверь текущую структуру:**
   ```bash
   ls -la memory/user-profile/
   ls -la .claude/memory/
   ```
   Убедись, что в `memory/user-profile/` есть 4 файла.

2. **Создай структуру папок в `.claude/memory/`:**
   ```bash
   mkdir -p .claude/memory/user-profile
   mkdir -p .claude/memory/facts
   mkdir -p .claude/memory/decisions
   mkdir -p .claude/memory/patterns
   mkdir -p .claude/memory/gotchas
   ```

3. **Перемести все файлы из `memory/user-profile/` в `.claude/memory/user-profile/`:**
   ```bash
   mv memory/user-profile/*.md .claude/memory/user-profile/
   ```

4. **Проверь, что файлы перемещены:**
   ```bash
   ls -la .claude/memory/user-profile/
   ```
   Должны быть 4 файла: coding-style.md, architecture-prefs.md, common-mistakes.md, work-patterns.md

5. **Удали пустую папку `memory/user-profile/`:**
   ```bash
   rmdir memory/user-profile/
   ```

6. **Проверь, что папка `memory/` пуста:**
   ```bash
   ls -la memory/
   ```
   Если пуста — удали её:
   ```bash
   rmdir memory/
   ```

7. **Создай файл `.claude/memory/MEMORY.md` (индекс памяти):**
   ```markdown
   # Memory Index — Централизованная память системы
   
   Вся память проекта System2 находится здесь. Автоматически пополняется через auto-learn и profile-update.
   
   ## User Profile
   - [Coding Style](user-profile/coding-style.md) — языки, стек, стиль кода, именование
   - [Architecture Preferences](user-profile/architecture-prefs.md) — философия, паттерны, экономика токенов
   - [Common Mistakes](user-profile/common-mistakes.md) — повторяющиеся ошибки и как их избегать
   - [Work Patterns](user-profile/work-patterns.md) — ритм работы, workflow с AI, организация файлов
   
   ## Patterns (Что работает хорошо)
   *(будет заполняться через auto-learn)*
   
   ## Facts (Данные о проектах и технологиях)
   *(будет заполняться через auto-learn)*
   
   ## Gotchas (Ошибки и workarounds)
   *(будет заполняться через auto-learn)*
   
   ## Decisions (Принятые архитектурные решения)
   *(будет заполняться через auto-learn)*
   
   ---
   
   **Последнее обновление:** 2026-08-18  
   **Структура:** относительные пути для переносимости между машинами
   ```

8. **Проверь финальную структуру:**
   ```bash
   find .claude/memory -type f -o -type d | head -20
   ```

## Критерии приёмки

- [ ] Папка `.claude/memory/user-profile/` создана
- [ ] 4 файла перемещены в `.claude/memory/user-profile/`
- [ ] Папки созданы: facts/, decisions/, patterns/, gotchas/
- [ ] Файл `.claude/memory/MEMORY.md` создан
- [ ] Старая папка `memory/` удалена
- [ ] Содержимое файлов user-profile не изменено

## Ограничения

- НЕ изменять содержимое файлов user-profile — только переместить
- НЕ трогать `.claude/memory/*.md` (analytical files) — оставить как есть
- Использовать `mv` для перемещения, не копировать

## Как закончить

1. Проверь структуру:
   ```bash
   tree .claude/memory -L 2
   # или
   find .claude/memory -type d
   ls -la .claude/memory/user-profile/
   ```

2. Коммит:
   ```bash
   git add .claude/memory/
   git rm -r memory/
   git commit -m "feat(memory): move user-profile to .claude/memory and create centralized structure"
   ```

3. Финальный ответ:
   ```
   ✅ T1 готов
   Коммит: [hash]
   Перемещено: 4 файла из memory/user-profile/ → .claude/memory/user-profile/
   Создано: facts/, decisions/, patterns/, gotchas/, MEMORY.md
   Удалено: старая папка memory/
   ```

---

**Команда проверки:** `ls -la .claude/memory/user-profile/ && cat .claude/memory/MEMORY.md | head -20`
