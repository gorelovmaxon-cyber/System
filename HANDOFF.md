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
5. Autopilot 2 — внедрён не заменой, а отдельным движком: см. раздел ниже.

По п. 4 позиция агента: полная переделка не оправдана; Hindsight даёт память вне
Git и конфликтует с журналом решений. Предложено забрать преимущества, а не менять систему.

## 2026-11-10 — ap2 подключён, Khoj восстановлен

- Autopilot v2.1.0 установлен как `/ap2` (коммит `3b170b3`), коллизии с `/autopilot`
  нет; вызывается только явной командой (`disable-model-invocation: true`).
  Схема — [docs/ap2-integration.md](docs/ap2-integration.md): роли, журнал решений
  и HANDOFF System2 снаружи, ap2 — движок исполнения внутри задания.
- По решению пользователя 2026-11-10 `/ap2` добавлен в таблицу рекомендаций
  [start](.claude/skills/start/SKILL.md) для одного проекта «под ключ» с дашбордом
  и слепой приёмкой; сайты по-прежнему через `/maxmade-autopilot`.
- Проверено: `ap.py init → stage → finish` во временном git-репозитории — папка
  прогона, `state.js` и дашборд создаются, rc=0. Полного прогона `/ap2` на реальной
  задаче ещё не было — первый прогон считать пробным.
- Khoj перезапущен 2026-11-10 (лог `runtime/khoj-diag-20261110.log`):
  `/api/update` → `{"status":"ok"}`, 172 записи из 23 файлов памяти;
  `search.js` отдаёт результаты Khoj, отсутствующая фраза — `results:[]`.
  Прежний 500 у старого экземпляра не воспроизвёлся, причина не установлена.

## Открытые вопросы

- Первый реальный прогон `/ap2` и решение, оставлять ли его в start после него.
- Hindsight: локальный или облачный; что делать с 220 тестами памяти и статусом
  `indexed`, если он заменит Khoj. С работающим Khoj срочности нет.
- Khoj не стартует автоматически с ОС: после перезагрузки запускать по
  [services/khoj/README.md](services/khoj/README.md).
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
