# SPEC: User Profile System — Этап 1

## Цель

Создать централизованную систему User Profile в `E:\System2\memory\user-profile\` для хранения паттернов разработки пользователя. Система извлекает знания из 12 отсканированных папок ПК.

## Источники данных

### Отсканировано успешно (12 папок)

1. **E:\Bot Stacy** — богатая .claude структура: agents/, commands/, rules/, CLAUDE.md, DECISIONS.md, FACTS.md
2. **E:\System2** — текущий проект, 50+ skills, .claude/memory/
3. **C:\Users\gorel\OneDrive\Документы\все для сайта** — website project, specialized agents
4. **C:\Users\gorel\OneDrive\Документы\claude2** — дубликат структуры "все для сайта"
5. **C:\dev** — agent/command/rules, CURSOR_MASTER_PROMPT.md
6. **E:\KWORK, E:\video-ai-digest, E:\system 2 site** — standard .claude/skills/
7. **E:\sohranenki** — backups с .claude структурами от 07.06
8. **E:\dev** — .deepseek/instructions.md, README.md
9. **E:\.claude, E:\candles** — minimal content

### Прочитанные ключевые документы (6 файлов)

- [E:\System2\OPUS.md](E:\System2\OPUS.md) — роль Opus в SystemQwen
- [E:\Bot Stacy\DECISIONS.md](E:\Bot Stacy\DECISIONS.md) — паттерн логирования решений
- [E:\System2\CLAUDE.md](E:\System2\CLAUDE.md) — three-phase workflow
- [E:\Bot Stacy\CLAUDE.md](E:\Bot Stacy\CLAUDE.md) — универсальные правила
- [E:\Bot Stacy\FACTS.md](E:\Bot Stacy\FACTS.md) — структура данных проекта
- [E:\System2\QWEN.md](E:\System2\QWEN.md) — роль Qwen-исполнителя
- [E:\Bot Stacy\.claude\rules\git-workflow.md](E:\Bot Stacy\.claude\rules\git-workflow.md) — git стандарты
- [E:\System2\.claude\skills\start\SKILL.md](E:\System2\.claude\skills\start\SKILL.md) — роутер задач
- [E:\System2\TICKET_TEMPLATE.md](E:\System2\TICKET_TEMPLATE.md) — шаблон тикетов
- [E:\System2\.claude\skills\writing-tickets-for-qwen\SKILL.md](E:\System2\.claude\skills\writing-tickets-for-qwen\SKILL.md) — экономия токенов
- [E:\Bot Stacy\.claude\rules\commit-messages.md](E:\Bot Stacy\.claude\rules\commit-messages.md) — Conventional Commits

## Выходные файлы (4 файла)

### 1. coding-style.md
**Что содержит:**
- Markdown-heavy документация с frontmatter
- Структура .claude/ (agents/, commands/, rules/, skills/)
- Frontmatter в SKILL.md файлах (name, description, disable-model-invocation)
- Обязательные ссылки на файлы в формате `[path](path)` для VS Code
- Conventional Commits формат
- Git workflow: branch naming, atomic commits, PR size limits

### 2. architecture-prefs.md
**Что содержит:**
- Agent-based architecture
- Orchestration model: Opus=brain/planner, Qwen/Sonnet=worker/executor
- Three-phase workflows с явными остановками (🛑 STOP)
- Skills-first philosophy: reusable assets
- GRILL → SPEC → TICKETS methodology
- "Один тикет = один коммит = одна остановка"
- Worktree isolation для параллельных изменений
- Token economics: ~5-7× экономия через SystemQwen

### 3. common-mistakes.md
**Что содержит:**
- Анти-паттерны из rules файлов
- ❌ Не додумывать молча — озвучивать предположения
- ❌ Не коммитить secrets, credentials, large binaries
- ❌ Не force push to main/master
- ❌ Не создавать huge PRs (ideal < 400 lines, max 1000)
- ❌ Не оставлять WIP commits в PR
- ❌ Не мержить без review
- ❌ Не реализовывать код в Opus (только примеры в тикетах)
- ❌ Не додумывать в Qwen за тикет (следовать алгоритму строго)

### 4. work-patterns.md
**Что содержит:**
- CLAUDE.md — project instructions
- FACTS.md — single source of truth для данных проекта (читать первым)
- DECISIONS.md — логирование решений с обоснованием (почему)
- Ticket workflow с детальными алгоритмами
- Обязательная секция "Перед началом работы: Открой VS Code в папке..."
- Критерии приёмки в тикетах
- Markdown links для файлов: `[path/file.js](path/file.js)` для кликабельности
- `/start` → роутер задач, предлагает `/systemqwen`
- Экономия токенов: детальные тикеты от Opus → минимум чтения для Qwen

## Ключевые паттерны для извлечения

### Из Bot Stacy
- FACTS.md: 337 строк данных проекта (цифры, тесты, механика)
- DECISIONS.md: решения с обоснованием, ссылки на FACTS.md
- CLAUDE.md: "Думать перед кодом", "Оркестрация: Opus — мозг, Sonnet — воркер"
- Git workflow: branch naming (`feature/`, `fix/`, `hotfix/`), atomic commits
- Commit messages: Conventional Commits format

### Из System2
- 50+ skills: autopilot, systemqwen, grill-me, to-spec, to-tickets, skill-forge
- `/start` skill: роутер с выбором модели под задачу
- OPUS.md: GRILL → SPEC → TICKETS → REVIEW с 🛑 STOP
- QWEN.md: строгое следование алгоритму тикета
- TICKET_TEMPLATE.md: обязательные секции с markdown links
- writing-tickets-for-qwen: экономия ~60× токенов через детальные инструкции

### Из "все для сайта" / claude2
- Specialized agents: design-qa, marketing-analyst, mood-synthesizer, reference-harvester
- Показывает domain-specific агенты для конкретных задач

### Общие паттерны
- .claude/ структура везде единообразна
- Frontmatter в skills: `---\nname:\ndescription:\n---`
- Markdown links обязательны: `[file.js](file.js)` вместо `` `file.js` ``
- Explicit stops между фазами: никакой автоматизации
- One ticket = one commit = one stop

## Constraints (CRITICAL)

❌ **НЕ создавать:**
- `/profile-update` skill (пользователь: "нет, не создавай")
- Изменения в auto-learn skill (пользователь: "ничего тоже не делай по этой задаче")

✅ **Создать ТОЛЬКО:**
- 4 файла в `E:\System2\memory\user-profile\`
- Извлечь паттерны из отсканированных 12 папок
- Без автоматизации, без новых skills

## Следующие шаги (TICKETS)

После утверждения SPEC создать тикеты T1-T4:
- T1: создать coding-style.md
- T2: создать architecture-prefs.md
- T3: создать common-mistakes.md
- T4: создать work-patterns.md

Каждый тикет с детальным алгоритмом для Qwen.
