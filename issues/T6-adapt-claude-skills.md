# T6 — Адаптировать скиллы .claude под SystemQwen

**What to build:** Точечно отредактировать 3 скилла в D:\System2\.claude\skills\ для работы SystemQwen режима. Остальные 44 скилла оставить без изменений — они полезны и не конфликтуют.

**Blocked by:** none

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `D:\System2` (File > Open Folder).

## Контекст

**Файлы для изменения:**
- [D:\System2\.claude\skills\autopilot\SKILL.md](D:\System2\.claude\skills\autopilot\SKILL.md) — убрать обязательность prerequisite для systemqwen
- [D:\System2\.claude\skills\systemqwen\SKILL.md](D:\System2\.claude\skills\systemqwen\SKILL.md) — исправить строку про вызов
- [D:\System2\.claude\skills\start\SKILL.md](D:\System2\.claude\skills\start\SKILL.md) — добавить systemqwen в таблицу маршрутов

**Смежные файлы для понимания контекста:**
- [D:\System2\README.md](D:\System2\README.md) — описание SystemQwen
- [D:\System2\OPUS.md](D:\System2\OPUS.md) — инструкции для Opus
- [D:\System\.claude\skills\autopilot\SKILL.md](D:\System\.claude\skills\autopilot\SKILL.md) — оригинальная версия для сравнения

**Ситуация:**
Папка `.claude` скопирована из D:\System (47 скиллов). Большинство скиллов (code-review, diagnosing-bugs, domain-modeling, tdd и т.д.) полезны и работают нормально. Нужно только точечно поправить 3 скилла для корректной работы SystemQwen режима.

## Что сделать

- [ ] В autopilot/SKILL.md убрать обязательность prerequisite (mattpocock/skills) для режима systemqwen
- [ ] В systemqwen/SKILL.md исправить строку 39: вместо `autopilot --mode=systemqwen` → `/systemqwen`
- [ ] В start/SKILL.md добавить systemqwen в таблицу маршрутов (строка ~26)
- [ ] Остальные 44 скилла оставить без изменений

## Файлы для изменения

- `D:\System2\.claude\skills\autopilot\SKILL.md` — строки 14-18 (prerequisite)
- `D:\System2\.claude\skills\systemqwen\SKILL.md` — строка 39
- `D:\System2\.claude\skills\start\SKILL.md` — строка 26 (таблица маршрутов)

## Алгоритм (шаг за шагом)

1. **В `D:\System2\.claude\skills\autopilot\SKILL.md` (строки 14-22):**

   **Было:**
   ```markdown
   ## Параметры (опционально)

   - `--mode=systemqwen` — экономичный режим: создать тикеты и остановиться, не реализовывать самому. Реализацию делает Qwen через VS Code расширение (документация: `D:\System2\README.md`).

   **Prerequisite:** the pipeline skills must be installed — `grilling`, `to-spec`, `to-tickets`, `implement`, `subagent-pipeline` (mattpocock/skills pack). If any is missing, install first:

   ```bash
   npx skills add mattpocock/skills
   ```
   ```

   **Стало:**
   ```markdown
   ## Параметры (опционально)

   - `--mode=systemqwen` — экономичный режим: создать тикеты и остановиться, не реализовывать самому. Реализацию делает Qwen через VS Code расширение (документация: `../../README.md`).

   **Prerequisite (только для обычного режима):** the pipeline skills must be installed — `grilling`, `to-spec`, `to-tickets`, `implement`, `subagent-pipeline` (mattpocock/skills pack). If any is missing, install first:

   ```bash
   npx skills add mattpocock/skills
   ```

   **Для режима `--mode=systemqwen` prerequisite НЕ нужны** — используется только создание тикетов (grilling, to-spec, to-tickets), реализацию делает Qwen.
   ```

   **Также изменить:**
   - Строка 22: `D:\System2\README.md` → `../../README.md` (относительный путь)

2. **В `D:\System2\.claude\skills\systemqwen\SKILL.md` (строка 39):**

   **Было:**
   ```markdown
   ## Реализация

   Вызов: просто запускаешь `autopilot --mode=systemqwen [задача]`
   ```

   **Стало:**
   ```markdown
   ## Реализация

   Вызов скилла:
   ```
   /systemqwen [задача]
   ```

   Это автоматически вызывает `autopilot --mode=systemqwen` внутри.
   ```

   **Также изменить пути на относительные (строки 32-35):**
   - Строка 32: `D:\System2\README.md` → `../../README.md`
   - Строка 33: `D:\System2\OPUS.md` → `../../OPUS.md`
   - Строка 34: `D:\System2\QWEN.md` → `../../QWEN.md`
   - Строка 35: `D:\System2\QWEN_VSCODE_SETUP.md` → `../../QWEN_VSCODE_SETUP.md`

3. **В `D:\System2\.claude\skills\start\SKILL.md` (после строки 26, в таблице маршрутов):**

   **Было:**
   ```markdown
   | Задача | Маршрут |
   |---|---|
   | Собрать что-то новое под ключ: приложение, сайт, бот, фича, скрипт | `/autopilot` |
   | Идея огромная и туманная, масштаб непонятен | `/wayfinder`, потом `/autopilot` |
   ```

   **Стало:**
   ```markdown
   | Задача | Маршрут |
   |---|---|
   | Собрать что-то новое под ключ: приложение, сайт, бот, фича, скрипт | `/autopilot` |
   | **Собрать экономично через SystemQwen (Opus планирует → Qwen реализует → явные остановки)** | **`/systemqwen`** |
   | Идея огромная и туманная, масштаб непонятен | `/wayfinder`, потом `/autopilot` |
   ```

4. **Проверить, что остальные скиллы НЕ тронуты:**
   ```bash
   git status D:\System2\.claude\skills\
   ```
   Должны быть изменены только: `autopilot/`, `systemqwen/`, `start/`

## Тесты должны проверить

- В autopilot/SKILL.md prerequisite помечен как "только для обычного режима"
- В systemqwen/SKILL.md строка 39 указывает `/systemqwen` (не `autopilot --mode=systemqwen`)
- В start/SKILL.md таблица маршрутов содержит строку про `/systemqwen`
- Пути в systemqwen/SKILL.md относительные (`../../`)
- Остальные 44 скилла не изменены

## Как закончить

1. Проверь изменённые файлы:
   ```bash
   cd D:\System2
   git diff .claude/skills/autopilot/SKILL.md
   git diff .claude/skills/systemqwen/SKILL.md
   git diff .claude/skills/start/SKILL.md
   ```

2. Коммит:
   ```bash
   cd D:\System2
   git add .claude/skills/autopilot/SKILL.md .claude/skills/systemqwen/SKILL.md .claude/skills/start/SKILL.md
   git commit -m "T6: адаптировать скиллы под SystemQwen"
   ```

3. Финальный ответ (максимум 6 строк):
   - Какие 3 скилла отредактированы
   - Что изменено в каждом (одной строкой)
   - Подтверждение, что остальные 44 скилла не тронуты
