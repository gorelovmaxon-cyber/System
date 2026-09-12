# Memory Index — централизованная память системы

Вся переносимая память System2 находится здесь. Формат записей определён в
[README.md](README.md), а корень разрешается через [memory contract](../../docs/memory-contract.md).

## User Profile
- [Coding Style](user-profile/coding-style.md) — языки, стек, стиль кода, именование
- [Architecture Preferences](user-profile/architecture-prefs.md) — философия, паттерны, экономика токенов
- [Common Mistakes](user-profile/common-mistakes.md) — повторяющиеся ошибки и как их избегать
- [Work Patterns](user-profile/work-patterns.md) — ритм работы, workflow с AI, организация файлов

## Patterns (наблюдаемые повторяемые паттерны)
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

**Последнее обновление:** 2026-09-12  
**Структура:** относительные пути для переносимости между машинами

## Observations / анализы

- [comparative-analysis-opus-gpt-qwen.md](comparative-analysis-opus-gpt-qwen.md)
- [nick-vels-autopilot-analysis.md](nick-vels-autopilot-analysis.md)
- [token-economics-analysis.md](token-economics-analysis.md)

Эти документы — наблюдения и материалы для дальнейшей проверки, не source of truth,
не пользовательские предпочтения и не обязательные инструкции. Непроверенные цифры
помечены в самих документах.
