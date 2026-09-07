# T3 — Добавить Phase 0 и Phase 8 в скилл /autopilot

**What to build:** Добавить в /autopilot две новые фазы: Phase 0 (bootstrap CLAUDE.md для новых проектов) и Phase 8 (обновление CLAUDE.md + auto-learn после завершения)

**Blocked by:** T2

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `D:\System` (File > Open Folder).

## Контекст

**Файлы для изменения:**
- [D:\System\.claude\skills\autopilot\SKILL.md](D:\System\.claude\skills\autopilot\SKILL.md)

**Смежные файлы для понимания контекста:**
- [D:\System\.claude\skills\auto-learn\SKILL.md](D:\System\.claude\skills\auto-learn\SKILL.md) — вызывается в Phase 8
- [D:\System2\CLAUDE.md](D:\System2\CLAUDE.md) — пример CLAUDE.md проекта
- [D:\System\memory\user-profile\work-patterns.md](D:\System\memory\user-profile\work-patterns.md) — паттерн bootstrap проектов

Нужно добавить в /autopilot две фазы:
- **Phase 0** (перед Phase 1) — если проект новый и нет CLAUDE.md, создать его
- **Phase 8** (после Phase 5) — обновить CLAUDE.md если нужно, затем вызвать /auto-learn

**Цель:** Каждый проект самодокументируется с первого запуска, и система учится после каждой задачи.

## Что сделать

- [ ] Добавить Phase 0 перед секцией "### Phase 1 — Grill"
- [ ] Модифицировать Phase 5 → переименовать в Phase 5 (оставить как есть)
- [ ] Добавить новую Phase 8 после текущей Phase 5
- [ ] Обновить секцию "## The Pipeline" — добавить упоминание Phase 0 и 8

## Файлы для изменения

- `D:\System\.claude\skills\autopilot\SKILL.md` — добавить Phase 0 и Phase 8

## Алгоритм (шаг за шагом)

1. **Прочитай текущий файл autopilot:**
   ```bash
   cat /d/System/.claude/skills/autopilot/SKILL.md
   ```

2. **Найди секцию "## The Pipeline"** (строка ~33)

3. **После заголовка "## The Pipeline" и перед "### Phase 1 — Grill" добавь Phase 0:**
   ```markdown
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
   ```

4. **Найди текущую "### Phase 5 — Finish"** (строка ~78)

5. **После Phase 5 добавь новую Phase 8:**
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

6. **Найди секцию "### Для режима systemqwen"** (строка ~84) — оставь без изменений

7. **В самом начале секции "## The Pipeline" (строка ~33) добавь общее описание:**
   
   Найди текущий текст:
   ```markdown
   ## The Pipeline
   
   ### Phase 1 — Grill (the only human gate)
   ```
   
   Замени на:
   ```markdown
   ## The Pipeline
   
   **Полный цикл:** Phase 0 (bootstrap) → Phase 1 (grill) → Phase 2 (spec) → Phase 3 (tickets) → Phase 3.5 (проверка режима) → Phase 4 (implement) → Phase 5 (finish) → Phase 8 (learn & update)
   
   ### Phase 0 — Bootstrap (новый проект)
   ```

8. **Обнови описание в frontmatter** (строка ~2-3):
   
   Найди:
   ```markdown
   description: Use when the user dictates an app, site, bot, or feature to build end-to-end and expects a finished result without reviewing specs, tickets, or code — vibecoding sessions, non-technical users, "собери под ключ", "build it for me", "не задавай лишних вопросов" requests. Also use when the user explicitly invokes /autopilot.
   ```
   
   Не меняй — оставь как есть (frontmatter не требует изменений).

## Тесты должны проверить

- Phase 0 добавлена перед Phase 1
- Phase 8 добавлена после Phase 5
- Секция "## The Pipeline" содержит упоминание всех фаз
- Все существующие фазы остались без изменений
- Секция "### Для режима systemqwen" осталась на месте

**Проверка вручную:**
```bash
grep -n "Phase 0" /d/System/.claude/skills/autopilot/SKILL.md
grep -n "Phase 8" /d/System/.claude/skills/autopilot/SKILL.md
grep "Полный цикл" /d/System/.claude/skills/autopilot/SKILL.md
```

## Как закончить

1. Проверь изменения:
   ```bash
   cd /d/System
   git diff .claude/skills/autopilot/SKILL.md
   ```

2. Коммит:
   ```bash
   git add .claude/skills/autopilot/SKILL.md
   git commit -m "feat(skills): add Phase 0 (bootstrap) and Phase 8 (learn) to autopilot"
   ```

3. Финальный ответ:
   ```
   ✅ T3 готов
   Коммит: [hash]
   Изменён: .claude/skills/autopilot/SKILL.md
   Добавлено: Phase 0 (bootstrap CLAUDE.md), Phase 8 (auto-learn)
   Строк добавлено: ~[N] additions
   ```

---

**Команда проверки:** `git diff HEAD~1 .claude/skills/autopilot/SKILL.md | head -100`
