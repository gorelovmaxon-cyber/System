# PLAN-RESULT — изолированная живая проверка

2026-10-12. Роль: отдельный планировщик; режим systemqwen.
Вход: «Старт: создай тестовый сайт по TASK.md». Исходная ревизия проекта
`390af87 DEMO-00: bootstrap isolated site test`; git status первоначально чистый.
Сохранены BRIEF, SPEC с 86 ID, один DEMO-01 и HANDOFF. Реализация не выполнялась.
Один scoped-коммит планирования; SHA — `git log -1 --oneline` после этой записи.

## Прочитанные правила и данные

Project: `AGENTS.md`, `CLAUDE.md`, `HANDOFF.md`, `TASK.md`,
`.claude/skills/start/SKILL.md`, `.claude/skills/site-build/SKILL.md`,
`.claude/system2.local.json` (только привязка), `.gitignore`.

Привязанный изолированный system: `CLAUDE.md`, `HANDOFF.md`,
`.claude/skills/start/SKILL.md`, `.claude/skills/site-build/SKILL.md`,
`.claude/skills/autopilot/SKILL.md` (контракт запуска и фазы планирования/передачи),
`.claude/skills/systemqwen/SKILL.md`, `.claude/skills/auto-learn/SKILL.md`,
`.claude/skills/skill-forge/SKILL.md` (разовое не оформлять; запрет обращения
к пользователю в этом тесте имеет приоритет), `docs/system-workflow.md`,
`docs/planner-brief.md`, `docs/decision-journal.md`,
`docs/routes/sites-workflow.md`, `docs/task-map.md`,
`docs/standards/site-creation.md`, `TICKET_TEMPLATE.md`,
`templates/evidence-report.md`, начало `docs/memory-contract.md`.

Дополнительное чтение в снимке: `.claude/memory/MEMORY.md`,
`.claude/memory/facts/writer-entries.md`, вывод registry (только ID/title/kind),
фрагменты `scripts/memory/search.js`, `decision-journal.js`,
`capture.js`, `save.js`; точечный rg `scripts/memory/README.md` и config.
Перечни файлов rg не означают чтение их содержимого. Некоторые первые
составные Get-Content были усечены, ключевые контракты перечитаны точечно.

## Фактические команды и результаты

Рабочий каталог project — привязанный каталог `project` тестового корня;
system — соседний изолированный `system`. Машинные абсолютные пути не
переносятся в память. Все следующие операции выполнялись только в них.

- `Get-Content .agents/skills/start/SKILL.md` — exit 1, путь отсутствует.
  `rg --files --hidden -g '!node_modules' -g '!.git'` нашёл `.claude/skills/start`.
- `Get-Content AGENTS.md,CLAUDE.md,.claude/skills/start/SKILL.md,HANDOFF.md,TASK.md`
  — exit 0, кириллица в выводе повреждена default decoding; перечитана UTF8.
- `Get-Content -Encoding UTF8 TASK.md,HANDOFF.md,.claude/system2.local.json`
  — exit 0, fixture project_id site-build-demo, root только изолированный system.
- `git status --short` — пусто; `git config user.name` → Bot;
  `git config user.email` → bot@example.com;
  `git log -1 --oneline` → 390af87.
- `Get-Content -Encoding UTF8 CLAUDE.md,HANDOFF.md,.claude/skills/start/SKILL.md`
  из system — exit 0, канонический start найден.
- Составной `Get-Content -Encoding UTF8 ... docs/routes/sites.md ...` — этот
  предполагаемый путь отсутствует. `rg --files docs/routes scripts/memory`
  дал `docs/routes/sites-workflow.md`, затем он прочитан напрямую.
- `Get-Content -Encoding UTF8 .claude/skills/site-build/SKILL.md,docs/standards/site-creation.md`
  — exit 0, специализированный маршрут и стандарт прочитаны напрямую.
- `node scripts/memory/decision-journal.js --help` — ошибка определения project_id:
  это не поддерживаемая команда help; применена документированная pending ниже.
- `node scripts/memory/decision-journal.js pending --project-root <project>`
  из system — `[]`.
- `node scripts/memory/search.js --query 'создание тестового сайта мастерской доступный диалог ассеты' --project site-build-demo`
  — ok:false, khoj-unavailable, disabled, fallback local; user-урок об ассетах.
- `node -e "const c=require('./config/system.example.json'); console.log(JSON.stringify(c.registry));"`
  — registry только site-build-demo.
- `node scripts/memory/search.js --query 'C-portfolio' --project site-build-demo`
  — ok:false, local fallback. Дополнительный запрос сделан по известному
  ID из найденного user-урока, хотя текущий fixture registry прежний сайт не содержит.
  Внешний первоисточник не проверялся; чужие project scope не использованы.
- `node --version` → v24.14.0; `python --version` → Python 3.12.10.
- `apply_patch` создал brief/spec/тикет. Первое построение матрицы через
  PowerShell here-string → `python -` испортило кириллицу вопросительными знаками.
  `rg -n` с паттерном трёх вопросительных знаков и U+FFFD по
  `.scratch/site-build-demo` выявил повреждение.
  Исправлено через UTF8-файл `matrix-temp.py`, записанный apply_patch:
  `python .scratch/site-build-demo/matrix-temp.py` → 86 ID, exit 0;
  временный файл удалён apply_patch до коммита. Повторная проверка документов
  обязательна ниже; первая зелёная команда генерации не считалась evidence.
- `node scripts/memory/capture.js session-summary --project site-build-demo --session site-build-demo-planning-20261012 --revision 1 --summary 'Planning complete; brief spec ticket and handoff prepared; no site code' --checks 'TASK and canonical site standard read|86 rule IDs mapped|implementation reserved for executor' --next-action 'Execute DEMO-01 in separate session; root browser QA; short correction; independent acceptance' --enqueue-only`
  — exit 0, evt_99b904360b6f, pending, attempts 0. Нет доставки/API-вызова.
- `git diff --check`, проверка UTF8/ссылок/86 ID, затем explicit git add только
  HANDOFF, PLAN-RESULT, BRIEF, SPEC и DEMO-01; коммит
  `DEMO-PLAN: prepare isolated site handoff`. Результат коммита — в git log.

## Отклонения и состояние памяти

Ошибочно прочитан целиком `facts/writer-entries.md` снимка вместо только
разрешённой user-записи. Он включал другие project scope; они не использованы
и не перенесены. Отклонение сообщено корневому агенту; он очистил изолированную
память. Никакие исходные каталоги/секреты/внешние первоисточники не открывались.
Это честный дефект минимизации чтения, а не успешная проверка scope-изоляции.

Auto-learn: проверка нового знания выполнена, no-op; разовые дизайнерские
решения и тестовое планирование не превращены в постоянные предпочтения.
Журнал при входе пуст. Session-summary отдельно: pending, не persisted,
не synced и не indexed. Skill-forge: разовая работа, навыки не созданы;
запрос пользователю исключён явными ограничениями теста.

## Передача и оставшийся этап

Исполнитель: DEMO-01, HTML/CSS/JS, локальный запуск и синтаксис, scoped-коммит,
awaiting-review. Root browser QA по SPEC; затем новая отдельная сессия
конкретной короткой правки, обновлённые evidence и независимая приёмка по
TASK/diff/стандарту. Root подтвердил средства QA, дополнительное интервью не нужно.
Планировщик не пишет код сайта и не запускает исполнителя/агентов.

Метрики: время/токены/стоимость unknown — нет полной метрики сессии/биллинга;
экономия не заявляется. Ошибки и исправление кодировки перечислены выше.
