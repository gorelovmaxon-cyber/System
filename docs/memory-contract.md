# Контракт памяти System2

Этот документ описывает переносимую часть памяти. Общий процесс работы — в
[docs/system-workflow.md](system-workflow.md).

## Где память

Канонический корень — `system_root`, найденный модулем
[resolve-paths.js](../scripts/memory/resolve-paths.js). Приоритет такой:

1. переменная окружения `SYSTEM2_ROOT`;
2. `config/system.local.json` в найденном корне System2;
3. поиск вверх от текущей папки каталога с `config/system.example.json` и `.git`;
4. понятная ошибка с инструкцией по `init-local-config.js`.

Относительный `memory_root` разрешается от `system_root`; по умолчанию это
`.claude/memory`. Резервный `.system-memory/` автоматически не создаётся: это
защищает от появления второй глобальной памяти.

## Каталоги и категории

Переносимые категории: `user-profile/`, `facts/`, `patterns/`, `decisions/` и
`gotchas/` внутри memory root. Каждая запись указывает категорию, дату, scope,
status и evidence настолько, насколько это известно. Поля знаний и правила
миграции уточнены в SC-03.

## Реестр проектов

Реестр находится в `config/system.example.json` и содержит стабильные поля
`project_id`, `title` и `kind`. `project_id` не меняется при переносе репозитория
или проекта на другой диск/ПК. Локальные соответствия `project_id → путь` находятся
в gitignored `config/system.local.json`; проект без локального пути не создаёт новую
копию общей памяти.

## Что не хранится в Git

В Git не попадают `config/system.local.json`, `.local/`, очереди, логи, токены,
пароли, API-ключи и другие значения секретов. Машино-специфичные пути можно хранить
только в локальном override. Git-история не заменяет резервную копию локального
состояния и не восстанавливает ignored/untracked данные.

## Производные контракты

Следующие тикеты дополняют этот хаб:

- SC-05 — **Поиск** и fallback;
- SC-07 — **Событие/Очередь**;
- SC-08 — **Writer**.

Эти механизмы используют один разрешённый memory root и не создают собственные
каталоги памяти.

## Событие

Событие имеет `schema_version`, детерминированный `event_id`, `project_id`, `kind`
(`commit` или `session-summary`), UTC `timestamp`, `source`, `summary`, `decisions`,
`user_corrections`, `checks` и `next_action`. Для commit source содержит `sha`, для
session-summary — `session_id` и целочисленный `revision`. Diff необязателен и
ограничен `events.max_diff_bytes`; браузерные чаты автоматически не собираются.

## Очередь

Очередь хранится вне Git в `data_dir/queue/events.jsonl`. Состояния: `pending` →
`in-flight` → `delivered` или `failed`. Enqueue долговечен до подтверждения,
доставка имеет ограниченные повторы и экспоненциальный backoff из конфигурации.
При старте незавершённые `in-flight` возвращаются в `pending`; получатель должен быть
идемпотентен по `event_id`. `queue-status.js` показывает ошибки и поддерживает
`--redeliver`.
