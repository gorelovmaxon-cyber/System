# Memory Index — централизованная память системы

Вся переносимая память System2 находится здесь. Формат записей определён в
[README.md](README.md), а корень разрешается через [memory contract](../../docs/memory-contract.md).

## User Profile

### Подтверждённые решения

[Четыре записи writer](user-profile/writer-entries.md) имеют `status: confirmed`,
`scope: user` и собственные source/evidence/event_id. Их payload сохранены:

| Тема | Дата / окончание event_id | Текущий источник для применения |
|---|---|---|
| Роли выбирает пользователь, модель не задаёт обязанности; приёмка независима | 2026-10-08 / `abda2410f436b8bc1170e2d7` | [CLAUDE: роли](../../CLAUDE.md#роли), [workflow](../../docs/system-workflow.md#роли) |
| Стандарт сайтов: дизайн-система, сетка, применимые ID; решения другого сайта не копируются | 2026-10-12 / `423e1896fad3a5d8629740d0` | [Стандарт](../../docs/standards/site-creation.md), [site-build](../skills/site-build/SKILL.md) |
| Общий стандарт ОК для любых исходников; создание, подготовка к импорту, доработка | 2026-10-13 / `4c8ed70fc922b2be12b3176b` | [Стандарт ОК](../../docs/standards/operational-cards.md), [operational-cards](../skills/operational-cards/SKILL.md) |
| Прямой вход «ОК: задача» читает стандарт и основной навык; поиск не заменяет чтение | 2026-10-13–14 / `25eff9774bcca1443accad98` | [ok](../skills/ok/SKILL.md) |

### Как читать профиль сейчас

1. Для предпочтения открыть соответствующую confirmed-запись выше и её source/evidence.
2. Для текущего процесса читать [CLAUDE](../../CLAUDE.md),
   [workflow](../../docs/system-workflow.md) и [границы проверки](../../docs/planner-brief.md).
   В частности, start рекомендует маршрут и останавливается; действующие инструкции
   уточняют историческую запись о цепочке start → site-build → autopilot.
3. Решения конкретной задачи искать в её TASK/spec/HANDOFF и проектном
   [журнале](../../docs/decision-journal.md); их границы не превращать в общие предпочтения.

### Исторические observation, не действующие инструкции

- [Coding Style](user-profile/coding-style.md) — старые примеры стека/стиля, общего подтверждения нет.
- [Architecture Preferences](user-profile/architecture-prefs.md) — старые схемы агентов, остановок и оценок стоимости.
- [Common Mistakes](user-profile/common-mistakes.md) — советы старого анализа; спорные пункты снабжены пометками.
- [Work Patterns](user-profile/work-patterns.md) — исторические шаблоны и примеры проектов, не текущие факты о пользователе.

Их source — исторический анализ, проверенный 2026-09-08; статус остаётся observation.
Непроверенные числа экономии — unverified, не измеренная выгода. Общий стек,
универсальная структура файлов и новая схема трёх моделей-проверяющих не подтверждены.
Запреты отдельной задачи, включая работы над сайтами, не являются вечными предпочтениями.
Retrieval может вернуть старую выдержку без соседней пометки: сверять полный раздел
и актуальный источник; supersedes сам по себе не удаляет старый результат.

## Patterns (наблюдаемые повторяемые паттерны)

Исторические названия ниже не переопределяют подтверждённый выбор ролей и текущий workflow.
- [Model Separation by Cognitive Load](patterns/model-separation-by-cognitive-load.md) — Opus думает, Sonnet/Qwen реализует
- [Explicit Stop Gates](patterns/explicit-stop-gates.md) — явные остановки между фазами
- [Sequential Subagent Pipeline](patterns/sequential-subagent-pipeline.md) — 1 тикет = 1 агент = 1 коммит

## Facts (данные с источником или явно отмеченные как наблюдение)
- [Technology Stack](facts/technology-stack.md) — языки, фреймворки, tools, APIs
- [Projects Overview](facts/projects-overview.md) — активные проекты, статус, эволюция систем
- [Writer Entries](facts/writer-entries.md) — записи, созданные живым writer'ом (наблюдение)

## Gotchas (ошибки и проверенные обходы)
- [Git + Node.js на Windows](gotchas/git-node-windows.md) — типичные проблемы и решения

## Decisions (решения с причиной и источником)
- [2026-08-17: SystemQwen Architecture](decisions/2026-08-17-systemqwen-architecture.md) — гибридная система Opus+Qwen
- [2026-08-18: SystemQwen Этап 1 Completion](decisions/2026-08-18-systemqwen-etap1-completion.md) — завершение фундамента

---

**Последняя сверка навигации профиля:** 2026-10-22 (PROFILE-01; даты исходных записей сохранены)
**Структура:** относительные пути для переносимости между машинами

## Observations / анализы

- [comparative-analysis-opus-gpt-qwen.md](comparative-analysis-opus-gpt-qwen.md)
- [nick-vels-autopilot-analysis.md](nick-vels-autopilot-analysis.md)
- [token-economics-analysis.md](token-economics-analysis.md)

Эти документы — наблюдения и материалы для дальнейшей проверки, не source of truth,
не пользовательские предпочтения и не обязательные инструкции. Непроверенные цифры
помечены в самих документах.
