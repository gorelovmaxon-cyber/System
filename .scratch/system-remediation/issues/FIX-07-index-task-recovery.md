# FIX-07 — Индекс: надёжная постановка задач и возобновление in-flight после аварии

**What to build:** Сбой очереди индекса не скрывается и восстанавливается: повтор persisted-события и команда reconcile создают недостающие задачи; причина сбоя видна; оставшиеся после аварии in-flight задачи безопасно возобновляются и не блокируют run.
**Requirement IDs:** SC-10 (R08), дефекты F05, F06.
**Blocked by:** FIX-01 (idempotent-путь writer), FIX-06 (jsonl/appendDurable)
**Status:** planned

## Контекст

Аудит:
- **F05:** ошибка `queueIndex` проглатывается; повтор выходит по раннему idempotent-пути до постановки задачи → событие навсегда без задачи индекса. Сам факт сохранения при отказе индекса допустим; дефект — отсутствие надёжного восстановления и видимой причины.
- **F06:** `run()` обрабатывает только pending/failed; in-flight после аварии остаётся навсегда (requeueFailed их не трогает).

Требования: сверка persisted-событий с задачами индекса (или иной долговечный механизм); повтор после восстановления журнала создаёт недостающую задачу; причина сбоя видна; in-flight после аварии безопасно возобновляется.

## Файлы для изменения

- `scripts/memory/writer.js` — на idempotent-пути: если `previous.indexed !== true` → попытаться `queueIndex(eventId, previous.written_files)` (дедупликация по task_id); при ошибке — не бросать, записать `index_error` в журнал writer (видимая причина). При первичной записи: ошибку `queueIndex` фиксировать в журнале (`index_error`), не глотать молча.
- `scripts/memory/indexer.js` — `reconcile()`: для каждого события из writerLog с `indexed !== true` вызвать `queueIndex` (создаёт недостающие задачи); CLI `--reconcile`; `run()`: перед обработкой вернуть в pending осиротевшие in-flight (нет `claimed_at` или старше порога, например 60с) и пометить claim при обработке (`claimed_at`).
- `scripts/memory/doctor.js` — (опционально) проверка «есть persisted-события без задач индекса» с инструкцией `indexer.js --reconcile`.
- `scripts/memory/tests/fix-07.test.js` — новый регрессионный тест.

## ⚠️ Файлы НЕЛЬЗЯ трогать

- Реальные `.local/`; контракт persisted/indexed (не откатывать запись при отказе индекса).

## Входные/выходные данные

`reconcile()` → число событий, для которых созданы/подтверждены задачи. `run()` → результаты, как сейчас. Журнал writer: `index_error` — последняя причина сбоя постановки.

## Алгоритм (шаг за шагом)

1. Writer idempotent-путь (из FIX-01): перед возвратом, если `previous.indexed !== true` → `try queueIndex(...)`; catch → `writerLog.append({...previous, index_error: message})` (последняя запись выигрывает; результат функции не меняет — запись уже persisted).
2. Writer первичный путь: catch у `queueIndex` → `writerLog.append({...result-поля, indexed:false, index_error: message})` вместо пустого catch.
3. Indexer `run()`: в начале — для in-flight записей: если `claimed_at` отсутствует или старше `RECLAIM_MS` → append `{...task, status:'pending'}` (attempts сохраняются). Далее обработка как сейчас + `claimed_at` при in-flight.
4. Indexer `reconcile()`: по `writerLog.records()` с `indexed !== true` → `queueIndex(event_id, written_files)` (дедуп по task_id). CLI `--reconcile`.
5. Doctor: добавить проверку (по желанию) и инструкцию.

## Критерии приёмки

- [ ] Сценарий F05: каталог журнала индекса недоступен → запись persisted, ошибка видна в `writerLog.get(evt).index_error`; после восстановления каталога повтор события (или `--reconcile`) создаёт задачу; повторной постановки дублей нет.
- [ ] Сценарий F06: in-flight задача без владельца → `run()` обрабатывает её (indexed или failed, не застревает in-flight); `requeueFailed` продолжает работать.
- [ ] Обычный поток записи→задача→run не сломан; задача на файл одна.
- [ ] `--reconcile` создаёт недостающие задачи для всех persisted-событий с `indexed:false`.

## Проверки

**Среда и предпосылки:** локальный Node; синтетические фикстуры; подмена `fetch` для reindex (как в аудите).
**Команды:** `node --test scripts/memory/tests/fix-07.test.js`.
**Ожидаемый результат:** красный на исходной реализации (F05, F06), зелёный после правки.
**Если проверка недоступна:** указать причину; awaiting-validation.

## Ограничения

Reindex по-прежнему требует реального механизма Khoj (SC-04, внешняя блокировка); здесь чинятся постановка/восстановление/статусы, не сам reindex. `RECLAIM_MS` — конфигурируемая константа.

## Как закончить

1. Тест → красный. 2. Правки writer/indexer. 3. Зелёный + прогоны FIX-01, FIX-06. 4. Scoped-коммит `FIX-07`. 5. `awaiting-review`; далее FIX-08.
