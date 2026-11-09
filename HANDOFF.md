# HANDOFF — systemqwen

Текущее состояние на 2026-11-09. История до этой даты —
[docs/archive/HANDOFF-history-to-2026-11-09.md](docs/archive/HANDOFF-history-to-2026-11-09.md);
прежние передачи в архиве не являются очередью на исполнение.

## AUDIT-2026-11-09 — выводы по 20 видео, исправления внесены

По поручению изучить канал «Никита Велс | AI» (20 видео) и определить, что нужно
System2. Полный отчёт — [reports/AUDIT-2026-11-09-NICKVELS-20-VIDEOS.md](reports/AUDIT-2026-11-09-NICKVELS-20-VIDEOS.md).
Состояние памяти: `journal_systemqwen_opus-executor-policy-20261109`,
`journal_systemqwen_tooling-candidates-20261109` — persisted; indexed не подтверждён
(Khoj не запущен).

Внесено в этом блоке: `.claude/settings.json` с правами и PreToolUse-хуком против
разрушительных команд; единый маршрут сайтов (`maxmade-autopilot` — вход,
`site-build` — внутренняя фаза) в CLAUDE.md, README, operations, usage-guide,
sites-workflow, site-creation, autopilot; оглавления в 15 скиллах длиннее 100 строк;
триггеры в описаниях скиллов; манифест требований и слепая приёмка в workflow,
TICKET_TEMPLATE и review-template; секции gotchas в 7 ключевых скиллах.

Проверки: `npm run check` — JS 69, Skill YAML 54, markdown, 5 checker PASS.
Живое поведение маршрутизации и хука в реальной сессии не проверялось —
только прямой вызов хука на тестовых командах.

## Решения пользователя 2026-11-09

1. Исполнитель всегда Opus 5.5; экономия токенов не аргумент при выборе маршрута.
2. Основной цикл — autopilot (grill → spec → тикеты → исполнитель).
3. Моды Claude Code: ставить только официальные (`blast-radius`, `you-should-know`,
   `replay-theater`) и `Reflect`.
4. Hindsight — кандидат на замену Khoj для памяти.
5. Autopilot 2 — обсуждается как движок фаз; решение не принято.

По п. 4 и 5 позиция агента: полная переделка не оправдана, у Autopilot нет ролей,
памяти и переносимости System2; Hindsight даёт память вне Git и конфликтует с
журналом решений. Предложено забрать преимущества, а не менять систему.

## Открытые вопросы

- Ставим ли Autopilot 2 project-local под другим именем (коллизия `/autopilot`).
- Hindsight: локальный или облачный; что делать с 220 тестами памяти и статусом
  `indexed`, если он заменит Khoj.
- Khoj не запущен: все записи имеют `indexed` не подтверждённым. Это дефект
  инфраструктуры поиска, а не памяти.
- Шесть блоков в `awaiting-review` с сентября 2026 требуют отдельного приёмочного
  прохода: UPDATE-E-20261101, CORE-FIX-20261022, PROFILE-01, CHECKS-20261021,
  START-ROUTING-01/02.

## Известные ограничения

- `check-skills.py` на чистом git-архиве падает без pyyaml; в рабочем окружении
  запускать через `.local/check-venv/Scripts/python.exe`.
- Memory bridge (bridge-server.js) остановлен; доставка через Activepieces
  не работает — известное состояние, не регрессия.
- Дефект `U+FFFD` в памяти воспроизводится, причина не установлена.

## Рабочая навигация

- Правила: [CLAUDE.md](CLAUDE.md), [system-workflow.md](docs/system-workflow.md),
  [planner-brief.md](docs/planner-brief.md).
- Проверки: [docs/checks.md](docs/checks.md). Память: [docs/decision-journal.md](docs/decision-journal.md).
- Старая история: [docs/archive/HANDOFF-history-to-2026-11-09.md](docs/archive/HANDOFF-history-to-2026-11-09.md).
