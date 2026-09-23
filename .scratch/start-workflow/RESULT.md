# Start workflow — единый evidence report

**Статус исполнителя:** in-progress; независимые `done`/READY не выставлены
**Дата:** 2026-09-23
**Исходный System SHA:** `f86cf0ac2da680c1f27fd1e0ecdf140d7ac015de`
**Источник задания:** [README](README.md), SW-01…SW-05

## Покрытие требований

| Требование | Реализованное поведение | Evidence | Статус |
|---|---|---|---|
| SW-R1 | Минимальный проектный адаптер Claude Code и локальная привязка | SW-01 ниже | pass в Claude Code 2.1.280; иные клиенты unverified |
| SW-R2 | Один start ведёт до spec/тикетов и передачи | ожидается SW-02/SW-05 | in-progress |
| SW-R3 | Источники прошлых сайтов, Khoj/fallback, scope | ожидается SW-03/SW-05 | in-progress |
| SW-R4 | Запись на контрольных точках и честные статусы | ожидается SW-04/SW-05 | in-progress |
| SW-R5 | Новая сессия и независимая приёмка | ожидается SW-05 | unverified |

## SW-01 — подключение реального клиента

Клиент: Claude Code CLI `2.1.280`; поддерживаемый проектный skill находится в
`.claude/skills/start/SKILL.md`. Механизм сверен с
[официальной документацией Claude Code](https://code.claude.com/docs/en/skills)
2026-09-23. Текущий Codex API не выдаётся за клиент `/start`.

Изолированный `node:test` (`node --test scripts/memory/tests/sw-01-project-entry.test.js`)
проверил существующий ID без local_paths, регистрацию нового ID только локально,
путь с пробелами/кириллицей, повтор setup, сохранение чужих AGENTS/HANDOFF и
отказ при конфликте пути/отсутствии System: 3/3 pass. Соседний старый
`fix-11.test.js` при совместном запуске дал 14/15 pass; G11 упал из-за
`install-hooks.sh: line 62: date: command not found` в Git Bash. Этот тест не
проверяет изменённый init-project и не объявлен пройденным.

В реальном `C-portfolio-v2` выполнен `init-project.js --client claude-code`:
проектные AGENTS/HANDOFF сохранены; создан небольшой адаптер и игнорируемый
локальный `.claude/system2.local.json`; System/runtime/backups не копировались.
Реальный `claude -p '/start Проверка подключения: назови project_id и путь
канонического start; не меняй файлы.' --permission-mode plan --output-format json`
из корня сайта вернул `site-portfolio` и
`E:\SystemTheBest\System\.claude\skills\start\SKILL.md`, exit 0; файлов
не менял. Это проверка slash-вызова и чтения адаптера, не доказательство полного
планирующего маршрута. Сайт опубликован scoped-коммитом `83d8528`; local/remote
SHA совпали.

## Ограничения и стоимость

SW-02…SW-05 и независимая сквозная приёмка ещё не выполнены. Проверка иной
версии/клиента требует отдельного live-вызова. CLI-проба SW-01: 21.6 с по
`duration_ms`, стоимость по ответу клиента `$0.107197`, контекстные токены
содержатся в локальном результате CLI; общая стоимость блока пока unknown,
поскольку остальные проверки продолжаются.

## Следующий шаг для исполнителя

Последовательно завершить SW-02…SW-05, обновляя эту таблицу и короткий HANDOFF.
Приёмщик сверяет весь блок; исполнитель не ставит себе `done`.
