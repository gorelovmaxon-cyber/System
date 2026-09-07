# T4 — Обновить /autopilot: относительные пути + Phase 0 & 8

**What to build:** Изменить скилл `/autopilot` — заменить абсолютные пути на относительные, добавить Phase 0 (bootstrap CLAUDE.md) и Phase 8 (обновление CLAUDE.md + auto-learn)

**Blocked by:** T3

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `D:\System2` (File > Open Folder).

## Контекст

Текущий `/autopilot` использует абсолютный путь `D:\System2\QWEN.md` (строка 61) и не имеет Phase 0 (bootstrap) и Phase 8 (learn). Нужно:
1. Заменить абсолютный путь на относительный
2. Добавить Phase 0 для создания CLAUDE.md в новых проектах
3. Добавить Phase 8 для обновления CLAUDE.md и вызова auto-learn после завершения
4. Обновить описание полного цикла

## Файлы для изменения

- [.claude/skills/autopilot/SKILL.md](.claude/skills/autopilot/SKILL.md) — заменить пути, добавить Phase 0 и Phase 8

## Файлы для чтения (контекст)

- [CLAUDE.md](CLAUDE.md) — пример CLAUDE.md текущего проекта
- [.claude/skills/auto-learn/SKILL.md](.claude/skills/auto-learn/SKILL.md) — вызывается в Phase 8 (обновлён в T3)

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `.claude/skills/auto-learn/SKILL.md` — уже обновлён в T3, не трогать
- `CLAUDE.md` — не изменять, только использовать как пример структуры

## Алгоритм (шаг за шагом)

1. **Прочитай текущий файл autopilot:**
   ```bash
   cat .claude/skills/autopilot/SKILL.md
   ```

2. **Замени абсолютный путь на относительный (строка 61):**
   
   Найди:
   ```markdown
   Документация: D:\System2\QWEN.md
   ```
   
   Замени на:
   ```markdown
   Документация: ../../QWEN.md
   ```

3. **Найди секцию "## The Pipeline"** (строка ~34)

4. **После заголовка "## The Pipeline" добавь описание полного цикла:**
   
   Найди:
   ```markdown
   ## The Pipeline
   
   ### Phase 1 — Grill (the only human gate)
   ```
   
   Замени на:
   ```markdown
   ## The Pipeline
   
   **Полный цикл:** Phase 0 (bootstrap) → Phase 1 (grill) → Phase 2 (spec) → Phase 3 (tickets) → Phase 3.5 (проверка режима) → Phase 4 (implement) → Phase 5 (finish) → Phase 8 (learn & update)
   
   ### Phase 0 — Bootstrap (новый проект)
   
   Если это первая работа с проектом и файл `CLAUDE.md` не существует в корне:
   
   1. **Прочитай проект:**
      - README.md (если есть)
      - package.json / requirements.txt / Cargo.toml / go.mod (определить стек)
      - Структура папок (src/, tests/, docs/, config/)
      - Основные файлы кода (3-5 файлов)
   
   2. **Создай CLAUDE.md в корне проекта** с секциями:
      ```markdown
      # CLAUDE.md — [Название проекта]
      
      ## Что это
      [1-2 предложения описания проекта]
      
      ## Стек технологий
      - Язык: [язык и версия]
      - Фреймворк: [если есть]
      - Зависимости: [основные библиотеки]
      - Тесты: [фреймворк тестирования]
      
      ## Структура проекта
      ```
      [корень]/
      ├── src/          — [описание]
      ├── tests/        — [описание]
      └── docs/         — [описание]
      ```
      
      ## Команды для работы
      - **Dev:** `[команда запуска dev-сервера]`
      - **Test:** `[команда запуска тестов]`
      - **Build:** `[команда сборки]`
      - **Deploy:** `[команда деплоя или "manual"]`
      
      ## Специфика проекта
      [Что важно знать: особенности архитектуры, ограничения, зависимости от внешних сервисов]
      ```
   
   3. **Коммит:**
      ```bash
      git add CLAUDE.md
      git commit -m "docs: add CLAUDE.md project bootstrap"
      ```
   
   **Готово, когда:** CLAUDE.md создан и закоммичен, или проект уже имеет CLAUDE.md.
   
   ---
   
   ### Phase 1 — Grill (the only human gate)
   ```

5. **Найди текущую секцию "### Phase 5 — Finish"** (строка ~79-83)

6. **После секции Phase 5 и перед секцией "### Для режима systemqwen" добавь Phase 8:**
   ```markdown
   
   ### Phase 8 — Learn & Update (после завершения)
   
   После финального отчёта Phase 5:
   
   1. **Проверить CLAUDE.md:**
      - Появилась ли новая информация о проекте? (новые команды, структура, зависимости)
      - Нужно ли обновить секции?
      - Если да → обновить CLAUDE.md и сделать коммит:
        ```bash
        git add CLAUDE.md
        git commit -m "docs: update CLAUDE.md after [краткое описание задачи]"
        ```
   
   2. **Запустить `/auto-learn`:**
      - auto-learn спросит: "Что запомнить из этой задачи?"
      - Если найдены паттерны стиля → auto-learn вызовет `/profile-update`
      - Если пользователь сказал "ничего" / "разовое" → продолжить без записи
   
   **Готово, когда:** CLAUDE.md актуален (или обновлений не было), auto-learn завершён.
   
   ---
   ```

7. **Проверь, что секция "### Для режима systemqwen"** (строка ~85+) осталась на месте и не изменилась

8. **Проверь изменения:**
   ```bash
   grep -n "Phase 0\|Phase 8" .claude/skills/autopilot/SKILL.md
   grep "Полный цикл" .claude/skills/autopilot/SKILL.md
   grep "D:\\\\System2" .claude/skills/autopilot/SKILL.md
   ```

## Критерии приёмки

- [ ] Путь `D:\System2\QWEN.md` заменён на `../../QWEN.md`
- [ ] Строка "Полный цикл" добавлена в начало секции "## The Pipeline"
- [ ] Phase 0 (bootstrap) добавлена перед Phase 1
- [ ] Phase 8 (learn & update) добавлена после Phase 5
- [ ] Секция "### Для режима systemqwen" осталась без изменений
- [ ] Все существующие Phase 1-5 остались без изменений
- [ ] Проверка: `grep "D:\\\\System2" .claude/skills/autopilot/SKILL.md` возвращает пусто

## Ограничения

- НЕ изменять существующие Phase 1-5
- НЕ трогать секцию "### Для режима systemqwen"
- НЕ трогать секцию "## Rationalizations — STOP"
- НЕ трогать секцию "## Red Flags"
- Использовать ТОЛЬКО относительные пути

## Как закончить

1. Проверь изменения:
   ```bash
   git diff .claude/skills/autopilot/SKILL.md | head -100
   grep -n "Phase 0" .claude/skills/autopilot/SKILL.md
   grep -n "Phase 8" .claude/skills/autopilot/SKILL.md
   grep "Полный цикл" .claude/skills/autopilot/SKILL.md
   grep "D:\\\\System2" .claude/skills/autopilot/SKILL.md && echo "ОШИБКА: абсолютный путь остался!" || echo "OK"
   ```

2. Коммит:
   ```bash
   git add .claude/skills/autopilot/SKILL.md
   git commit -m "feat(skills): add Phase 0 (bootstrap) and Phase 8 (learn) to autopilot, use relative paths"
   ```

3. Финальный ответ:
   ```
   ✅ T4 готов
   Коммит: [hash]
   Изменён: .claude/skills/autopilot/SKILL.md
   Замены: D:\System2\QWEN.md → ../../QWEN.md
   Добавлено: Phase 0 (bootstrap CLAUDE.md), Phase 8 (auto-learn), "Полный цикл"
   Строк добавлено: +[N] additions
   ```

---

**Команда проверки:** `git diff HEAD~1 .claude/skills/autopilot/SKILL.md | grep -E "^\+.*Phase" | head -10`
