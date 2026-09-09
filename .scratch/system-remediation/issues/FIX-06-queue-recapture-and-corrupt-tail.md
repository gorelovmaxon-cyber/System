# FIX-06 — Очередь/журналы: повторный capture без конфликта по времени и устойчивость к оборванному хвосту JSONL

**What to build:** Повторный capture того же commit/session revision не отклоняется из-за нового времени захвата; оборванная последняя строка JSONL не блокирует очередь и журналы writer/indexer; повреждённые строки не удаляются молча и доступны для диагностики.
**Requirement IDs:** SC-07 (R07), дефекты F09, F10.
**Blocked by:** none (общий модуль `jsonl.js` создаётся здесь; FIX-05 правит те же файлы — выполнять после FIX-05)
**Status:** planned

## Контекст

Аудит:
- **F09:** `eventIdFor` детерминирован, но `createEvent` проставляет новый `timestamp` при каждом capture → `enqueue` сравнивает полный JSON и бросает «different content». Идентичность события не должна зависеть от времени повторного захвата; настоящие конфликты содержимого должны по-прежнему отклоняться.
- **F10:** `records()` делает `JSON.parse` каждой строки; оборванный хвост → `SyntaxError` в конструкторе, предыдущие корректные события недоступны. Аналогичный необработанный parse — в `writer-log`/`indexer-log`. Нужна стратегия восстановления: корректные записи доступны, повреждённые сохранены для диагностики (карантин), обработка продолжается.

## Файлы для изменения

- `scripts/memory/jsonl.js` — новый общий модуль: `readRecords(file, keyFn)` → `{records: Map, corrupt: [...]}` (толерантный построчный parse, без выбрасывания); `appendDurable(file, record)` — open 'a' + write + fsync + close (долговечность хвоста).
- `scripts/memory/queue.js` — `records()` через `jsonl.readRecords(this.file, r => r.event?.event_id)`, хранить `this._corrupt`; `append` через `appendDurable`; `quarantineCorrupt()` — перенести повреждённые ст��оки в `events.jsonl.corrupt-<ts>` (атомарная перезапись главного файла корректными строками); `enqueue` сравнивать каноническое содержимое без `timestamp`.
- `scripts/memory/events.js` — `contentKey(event)` = JSON без поля `timestamp` (канон для сравнения содержимого); используется в `queue.enqueue`.
- `scripts/memory/writer-log.js`, `scripts/memory/indexer-log.js` — толерантное чтение через `jsonl.readRecords`, `append` через `appendDurable`; экспонировать `corrupt()`.
- `scripts/memory/queue-status.js` — показывать `corrupt_count` и, при запросе `--quarantine`, вызывать карантин.
- `scripts/memory/tests/fix-06.test.js` — новый регрессионный тест.

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `.local/` реальные; формат событий (schema_version '1') — не менять; поле `timestamp` остаётся обязательным в событии.

## Входные/выходные данные

`contentKey(event)`: JSON.stringify события с удалённым `timestamp`. `readRecords(file, keyFn)` → `{records, corrupt:[{index, raw}]}`. `quarantineCorrupt()` → число перемещённых строк; исходные повреждённые данные сохраняются в sidecar-файле.

## Алгоритм (шаг за шагом)

1. `jsonl.js`: читать файл построчно; пустые строки пропускать; `JSON.parse` в try — при ошибке собрать `{index, raw}`; ключ записи — `keyFn(record)`; одинаковые ключи — последняя строка выигрывает (как сейчас). `appendDurable` — open 'a', write, fsync, close.
2. `queue.enqueue`: существующий → `contentKey(existing.event) === contentKey(event)` → вернуть существующий (повторный capture ок); иначе — «different content» (настоящий конфликт). Разделить во времени: `event_id` и содержимое детерминированы, timestamp не участвует в сравнении.
3. `queue.records()`: толерантно; `process()/list()` работают только с корректными записями; `quarantineCorrupt()` переносит хвост в sidecar (файл `events.jsonl.corrupt-<ISO ts>`), главный файл переписывается атомарно корректными строками; повреждённые данные не удаляются.
4. `writer-log`/`indexer-log`: толерантное чтение (журнал writer критичен для FIX-01: сбойный хвост не должен блокировать writer); `corrupt()` для диагностики.
5. `queue-status`: вывод `corrupt_count` (и `--quarantine`).

## Критерии приёмки

- [ ] Повторный capture того же commit (другой timestamp) → enqueue возвращает существующую запись без ошибки; реально изменённое содержимое (другая summary) → «different content».
- [ ] Оборванная строка после корректного события: конструктор не бросает, корректные события доступны и доставляются, повреждённая строка видна в `corrupt_count`.
- [ ] Карантин переносит повреждённые строки в sidecar, не теряя их; после карантина файл читается без corrupt.
- [ ] `writer-log`/`indexer-log` с оборванным хвостом: чтение не падает, корректные записи доступны.
- [ ] `appendDurable` сохраняет рабочее поведение добавления (долговечный хвост).

## Проверки

**Среда и предпосылки:** локальный Node; синтетические фикстуры.
**Команды:** `node --test scripts/memory/tests/fix-06.test.js` (+ FIX-05 и FIX-01 на совместимость).
**Ожидаемый результат:** красный на исходной реализации (F09, F10), зелёный после правки.
**Если проверка недоступна:** указать причину; awaiting-validation.

## Ограничения

Карантин переписывает главный файл атомарно (tmp+rename), исходные повреждённые байты сохраняются дословно в sidecar. События с `timestamp`-различием считаются одним содержимым — документируется в контракте очереди (SC-07).

## Как закончить

1. Тест → красный. 2. Правки `jsonl.js` + queue/events/logs. 3. Зелёный + прогоны FIX-01, FIX-05. 4. Scoped-коммит `FIX-06`. 5. `awaiting-review`; далее FIX-07.
