# SC-07 — Capture событий и надёжная локальная очередь

**What to build:** Приём событий (commit и session-summary) по фиксированному JSON-контракту, долговечная локальная очередь с повторами/backoff, видимостью состояния и командой повторной доставки — без потери событий и без дублей при обрыве процесса.
**Requirement IDs:** R07
**Blocked by:** SC-02
**Status:** planned
**Перед началом работы:** Открой VS Code в `E:/System2`. SC-02 принят (resolve-paths, data_dir `.local/` вне Git, docs/memory-contract.md). Проверь, что `.local/` gitignored.

## Контекст

SPEC: событие несёт schema_version, event_id, project_id, kind (commit/session-summary), timestamp UTC, source, summary, decisions, user_corrections, checks, next_action; diff — опционален и ограничен по размеру. Для commit event_id детерминирован project_id + SHA; для резюме — session_id + revision. Браузерные чаты автоматически не собираются: резюме передаёт явно агент/пользователь. Контракт «Очередь»: локальное долговечное хранение до подтверждения; ограниченные повторы, backoff, отображение неотправленных/ошибочных событий и команда повторной доставки. Прекращение процесса между записью и подтверждением не теряет событие и не создаёт дубль.

Сейчас события реально не обрабатываются: в `.git/hooks/post-commit` (вне дерева) curl-заглушка шлёт JSON в webhook Activepieces — без очереди, повторов и контракта. Этот тикет создаёт контракт и очередь; hook переключит SC-11, writer/flow подключатся в SC-08/09.

## Файлы для изменения

- [scripts/memory/events.js](../../../scripts/memory/events.js) — **новый**; контракт события (schema/валидация, генерация event_id, нормализация kind=commit/session-summary, усечение diff по лимиту).
- [scripts/memory/queue.js](../../../scripts/memory/queue.js) — **новый**; долговечная очередь на JSONL в `<data_dir>/queue/`: enqueue, обработка с retry/backoff, статусы, ack/nack, атомарность против обрыва.
- [scripts/memory/capture.js](../../../scripts/memory/capture.js) — **новый**; CLI приёма событий: `capture.js commit --project <id> --sha <sha> [--message ...] [--diff <file>]` и `capture.js session-summary --project <id> --session <session_id> [--file summary.json|--text ...]`; валидация → событие → enqueue → попытка доставки.
- [scripts/memory/deliver.js](../../../scripts/memory/deliver.js) — **новый**; доставка из очереди получателю (адрес из конфига: сначала webhook Activepieces для commit-событий и/или endpoint bridge — фактический получатель фиксирует SC-09/SC-11; здесь — интерфейс доставки по HTTP с ограниченными повторами и логом статусов).
- [scripts/memory/queue-status.js](../../../scripts/memory/queue-status.js) — **новый**; CLI: статус очереди (pending/in-flight/delivered/failed, счётчики, последние ошибки) и `--redeliver` для failed/pending.
- [docs/memory-contract.md](../../../docs/memory-contract.md) — существующий; добавить секции «Событие» и «Очередь» (поля, типы, event_id, статусы, путь data_dir, правило «queue вне Git»).
- [scripts/memory/README.md](../../../scripts/memory/README.md) — существующий; документация capture/queue/status команд и примеров.
- [config/system.example.json](../../../config/system.example.json) — существующий; значения по умолчанию: `queue.retries_max`, `queue.backoff_ms`, `events.max_diff_bytes`, `delivery.endpoint` (плейсхолдер).

## Файлы для чтения (контекст)

- [SPEC.md](../SPEC.md) — контракты «Событие» и «Очередь» (канон полей).
- [docs/memory-contract.md](../../../docs/memory-contract.md) — хаб контрактов (SC-02).
- [scripts/memory/resolve-paths.js](../../../scripts/memory/resolve-paths.js) — API data_dir/конфига.
- [.gitignore](../../../.gitignore) — убедиться, что `.local/` покрыт.
- Существующий hook `.git/hooks/post-commit` — только чтение (содержимое перенесёт SC-11).

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `.git/hooks/post-commit` — переключение hook на очередь делает SC-11; здесь не менять.
- Память `.claude/memory/` и writer (SC-08) — здесь не пишем в память.
- Khoj/Activepieces конфиги.
- Файлы в `.local/` не коммитить и не редактировать руками (кроме диагностики).

## Входные/выходные данные

**Событие (канон в docs/memory-contract.md, здесь — реализация):**
```json
{
  "schema_version": "1",
  "event_id": "evt_<12hex>",          // commit: sha256(project_id + "|" + sha)[:12];
                                      // session: sha256(session_id + "|" + revision)[:12]
  "project_id": "systemqwen",          // из реестра SC-02
  "kind": "commit" | "session-summary",
  "source": { "sha": "…" } | { "session_id": "…", "revision": 1 },
  "timestamp": "2026-09-08T12:34:56Z", // UTC
  "summary": "…", "decisions": ["…"], "user_corrections": ["…"],
  "checks": ["…"], "next_action": "…",
  "diff": "…"                          // только commit; усекается до events.max_diff_bytes
}
```
Валидация: обязательные поля по kind; неизвестный kind/project_id — ошибка; size guard на всё событие.
**Очередь:** JSONL-строки `<data_dir>/queue/events.jsonl` (запись = событие + попытка доставки + статус). Статусы: pending → in-flight → delivered | failed(с причиной). Ack после успешной доставки; nack → retry с backoff до retries_max, затем failed. Обрыв между записью и ack: при старте события in-flight без ack возвращаются в pending, доставка повторяется — дубль исключает получатель (writer идемпотентен по event_id, SC-08) или сам deliver.js (проверка event_id в логе доставленных).

## Алгоритм (шаг за шагом)

1. **Реализовать events.js**: схема и валидация; генерация event_id по правилу выше (для session-summary revision увеличивает вызывающий — при повторном резюме той же сессии revision+1, чтобы id не совпал); усечение diff; `toJSON()` без потери полей.
2. **Реализовать queue.js**: атомарная запись в JSONL (append + flush, отметка времени); чтение очереди; состояния; метод `enqueue`; цикл доставки: достать pending → пометить in-flight (в JSONL) → вызвать deliver → ack (delivered) или nack (счётчик попыток, backoff). При старте — восстановление: in-flight → pending. Корректность при конкурентном запуске одного процесса (lock-файл).
3. **Реализовать deliver.js**: HTTP POST события на `delivery.endpoint` (из конфига; пока плейсхолдер — тесты направляют на локальный test-получатель); таймаут; классификация ошибок (сеть/timeout/4xx/5xx); возврат ok/retry/fail.
4. **Реализовать capture.js**: разбор аргументов; для commit: принять sha (обязателен), message, diff (файл или пусто); для session-summary: summary.json (поля из контракта: summary/decisions/corrections/checks/next_action; допускается `--text` с простым парсингом или требует файл — реши и задокументируй), session_id, revision. Событие валидируется → enqueue → попытка доставки (не блокируя commit).
5. **Реализовать queue-status.js**: вывод счётчиков по статусам, список последних failed с причинами, `--redeliver [failed|pending|all]`.
6. **Обновить контракт-док и конфиг**: секции «Событие» и «Очередь» в docs/memory-contract.md; значения по умолчанию в config; README команд.
7. **Проверить** сценариями ниже (с тестовым HTTP-получателем на localhost).

## Критерии приёмки

- [ ] Первый коммит проекта (SHA валиден, diff пуст), кавычки/кириллица/UTF-8 в summary, большой diff (превышает лимит) — событие корректно создаётся, diff усекается, JSON валиден.
- [ ] Получатель выключен: событие не теряется — статус pending/failed с причиной; после включения получателя `--redeliver` доставляет, дублей нет (event_id один).
- [ ] Обрыв процесса между записью и ack (эмуляция: kill deliver-цикла после enqueue, до ack): после перезапуска событие доставляется ровно один раз.
- [ ] Ошибки видны: `queue-status.js` показывает failed с причиной; повторные попытки ограничены (retries_max) с backoff.
- [ ] Обработка очереди не блокирует и не зависит от скорости AI-запроса/получателя (таймауты, отдельный процесс/цикл).
- [ ] `git status` не показывает `.local/`; docs/memory-contract.md содержит секции «Событие» и «Очередь».
- [ ] R07: события с решениями из сессии дополняют Git через очередь; повторы/сбои/обрывы обработаны (полная цепочка до записи в Git — SC-09/SC-11).

## Проверки

**Среда и предпосылки:** локально, Node. Для тестов — простой локальный HTTP-получатель (скрипт в тестовой папке, не в проде): `node scripts/memory/…` + временный endpoint.
**Команды:** `node scripts/memory/capture.js commit --project systemqwen --sha <sha> --message "…"`, `node scripts/memory/queue-status.js`, `node scripts/memory/queue-status.js --redeliver failed` (команды создаются в этом тикете; точные примеры — в scripts/memory/README.md).
**Ожидаемый результат:** событие доставляется; сбойные сценарии воспроизводятся по шагам из критериев с фиксацией в отчёте.
**Если проверка недоступна:** реальный endpoint доставки появится в SC-09/SC-11; до того тесты идут на тестовом получателе — это не «мок вместо живой проверки», а проверка очереди как изолированного контракта.

## Ограничения

- Здесь нет записи в память (SC-08), нет flow Activepieces (SC-09), нет hooks (SC-11) — только события, очередь и доставка.
- Не собирать содержимое браузерных чатов автоматически; session-summary передаётся явно.
- data_dir и очередь — вне Git; в общий репозиторий не попадают.

## Как закончить

1. Проверить diff; выполнить проверки; сохранить сценарии и результаты в отчёт тикета.
2. Отдельный коммит: scripts/memory/{events,queue,capture,deliver,queue-status}.js, README, docs/memory-contract.md, config/system.example.json.
3. Исполнитель ставит awaiting-review, приёмщик — done после приёмки.
4. Ответ до 6 строк: ID, результат, проверки, коммит, ограничения, следующий доступный тикет (SC-06 → SC-08 зависит от SC-03+SC-07; фактически по графу исполнения после SC-07 доступен SC-06, если ещё не принят, иначе SC-08).
