# FIX-08 — Индекс: честный статус события (indexed только при успехе всех задач)

**What to build:** `indexed:true` у события выставляется только после успешной индексации всех обязательных файлов события; частичный успех и последующее восстановление отражаются честно.
**Requirement IDs:** SC-10 (R08), дефект F07.
**Blocked by:** FIX-07
**Status:** planned

## Контекст

Аудит: событие пишется в facts и decisions; первый файл индексируется (200), второй — 503; у события `indexed:true`, хотя одна задача failed. Причина: `run()` выставляет `writerLog.indexed = true` после каждого отдельного успеха. Нужно вычислять итог по всем задачам события.

## Файлы для изменения

- `scripts/memory/indexer.js` — после каждой задачи пересчитывать статус события по всем его задачам: `indexed:true` только если все задачи события `indexed`; при частичном успехе — `indexed:false` и поле `index_partial`/счётчики (`tasks_total`, `tasks_indexed`). Запись в writerLog — актуальная сводка.
- `scripts/memory/tests/fix-08.test.js` — новый регрессионный тест.

## ⚠️ Файлы НЕЛЬЗЯ трогать

- Реальные `.local/`; контракт `indexed` как «все обязательные файлы события проиндексированы» — фиксируется в memory-contract.

## Входные/выходные данные

Журнал writer события: `{..., indexed: boolean, index_tasks_total?: n, index_tasks_indexed?: n}`. `run()` возвращает per-task результаты (как сейчас).

## Алгоритм (шаг за шагом)

1. После завершения каждой задачи: `all = indexerLog.records()` по event_id; `indexed = all.length > 0 && all.every(t => t.status === 'indexed')`; `writer = writerLog.get(event_id)`; `writerLog.append({...writer, indexed, index_tasks_total: all.length, index_tasks_indexed: count('indexed')})`.
2. Если событие частично failed → `indexed:false`; после `requeueFailed` + `run` при полном успехе → `indexed:true` (последняя запись выигрывает).
3. Статусы в `run()`/`status()` не меняются.

## Критерии приёмки

- [ ] Событие с двумя файлами: успех первого + 503 второго → `writerLog.get(evt).indexed === false`, счётчики отражают 1 из 2.
- [ ] После `requeue-failed` и повторного `run` с успехом обоих → `indexed === true`.
- [ ] Событие с одной задачей: успех → `indexed:true` (поведение не сломалось).
- [ ] Событие без задач (не было записи) не получает `indexed:true` по ошибке.

## Проверки

**Среда и предпосылки:** локальный Node; подмена `fetch` для reindex.
**Команды:** `node --test scripts/memory/tests/fix-08.test.js` (+ FIX-07).
**Ожидаемый результат:** красный на исходной реализации (F07), зелёный после правки.
**Если проверка недоступна:** указать причину; awaiting-validation.

## Ограничения

Живой reindex Khoj — внешняя блокировка (SC-04); здесь чинится локальная логика статусов (как в аудите).

## Как закончить

1. Тест → красный. 2. Правки indexer.js. 3. Зелёный + прогон FIX-07. 4. Scoped-коммит `FIX-08`. 5. `awaiting-review`; далее FIX-09.
