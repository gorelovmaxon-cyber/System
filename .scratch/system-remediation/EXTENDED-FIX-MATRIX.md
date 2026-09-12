# EXTENDED-FIX-MATRIX — исполнение расширенного пакета

База исполнения: `c0b345932ec9446de13c9d8233888adc00ccc1c8` (2026-09-11).
До начала исправлений: основной набор `52/52`; T1 и B01…B19/F05…F10 воспроизводятся.
Все проверки выполняются на синтетических временных корнях. Настоящая `.claude/memory` не используется.

Ревизия 2026-09-11 (после четвёртого независимого ревью): добавлены строки U1 и U2, набор
`node --test scripts/memory/tests/*.test.js` — 100/100. Матрица описывает, что проверено
локально; `READY` выставляет только независимая приёмка.

Ревизия 2026-09-12 (после пятого независимого ревью): добавлены строки V1 и G15, набор
`node --test scripts/memory/tests/*.test.js` — 108/108.

Статусы: `red` — дефект воспроизведён; `green` — положительная регрессия проходит;
`contract` — сначала требуется зафиксировать выбранное поведение; `live` — требуется внешняя среда;
`review` — требуется независимая приёмка.

| ID | FIX/область | Требование | Положительная проверка | Статус |
|---|---|---|---|---|
| T1 | FIX-02 | Один владелец при stale-reclaim, паузе/смерти любого из трёх процессов | Трёхпроцессная регрессия и crash boundaries | green |
| B01 | FIX-01 | Обязательные поля принимаются только с допустимыми типами | undefined/null/object/array отклоняются | green |
| B02 | FIX-01/path safety | Запись не выходит из memory root через junction/reparse point | Junction и существующие symlink-предки отклоняются | green |
| B03 | FIX-11/config | Explicit root имеет приоритет и не смешивается с local config другой копии | Две валидные копии, cwd/env/config matrix | green |
| B04 | FIX-03/config | Глубокое слияние default/local с сохранением false/0 | Минимальный и частичный override | green |
| B05 | FIX-03 | Поиск читает из фактического configured memory root | Абсолютные/относительные Windows-пути custom root | green |
| B06 | SC-12/init | Повторный init не стирает заполненный HANDOFF | Новый/заполненный/повреждённый HANDOFF | green |
| B07 | FIX-07 | Изменённый файл можно индексировать новой ревизией | Повтор manual после изменения/удаления | green |
| B08 | FIX-07/08 | Retry учитывает backoff и next_attempt_at | Управляемые часы, обычный и forced retry | green |
| B09 | FIX-06 + FIX-01/07 | Оборванный хвост JSONL сохраняется в карантин, старые записи доступны | writer/indexer/queue tail и middle corruption | green |
| B10 | FIX-06/events | Усечение не разрывает UTF-8 и соблюдает byte limit | Кириллица, emoji, малые/нулевые лимиты | green |
| B11 | FIX-06/events | Полная схема события на границе enqueue | Прямой API, capture и file input | green |
| B12 | FIX-11/hooks | Installer не заменяет активный пользовательский hooksPath молча | Реальный marker hook, relative/absolute/worktree | green |
| B13 | SC-02/11/12 | project_id берётся из единого local registry; unknown fail-closed | init registration, HTTPS/SSH/no remote | green |
| B14 | FIX-03 | Scope фильтруется до выбора и ранжирования | Одинаковый запрос в нескольких scopes и hit order | green |
| B15 | FIX-01/04 | Безопасная совместимость со старыми intent/hash | LF/CRLF, пробелы, defaults, partial states | green |
| B16 | FIX-07 | Одна pending-задача на файл/ревизию | Журнал, Map и число HTTP-обработок | green |
| B17 | FIX-01/09 | Пустой пакет отклоняется и не закрепляет event_id | Пустой write, затем непустой write | green (reject) |
| B18 | FIX-11/Figma | Extractor соблюдает явно переданный nodeId | Fixture, URL node-id, соседние узлы | green (filter locally) |
| B19 | FIX-07/path safety | Indexer принимает только фактические пути внутри memory root | `..`, junction, case/separator, похожий сосед | green |
| F05 | FIX-07 | Повтор writer восстанавливает потерянную index-задачу | Ошибка enqueue → retry/reconcile | green |
| F06 | FIX-07 | Осиротевший in-flight возвращается в обработку | Lease expiry/requeue/run | green |
| F07 | FIX-08 | Event indexed только после успеха всех файлов | Один success + один failure | green |
| F08 | FIX-05 | Устаревший worker не затирает delivered | Два обработчика, lease/generation CAS | green |
| F09 | FIX-06 | Recapture одного commit не конфликтует из-за timestamp | Один identity, повтор с новым временем | green |
| F10 | FIX-06 | Оборванный хвост очереди не скрывает старые события | Tail quarantine/recovery | green |
| U1 | FIX-02 | Гибель keeper'а не выдаёт право входа второму при живом владельце; пауза/смерть writer'а, отказ keeper'а, штатный release | `fix-02-keeper.test.js` 6/6 (endpoint свободен, но `REFUSED:live-owner`; `assertHeld` → `LOCK_AUTHORITY_LOST`) | green |
| U2 | FIX-06 | Ремонт оборванного хвоста не обнуляет корректную копию; durability append | `fix-06.test.js` U2 7/7 (отказ/смерть на 3 границах, byte-exact prefix, fsync append fd) | green |
| V1 | FIX-02 | Устаревший претендент не заменяет и не удаляет guard живого владельца | `fix-02-v1-ownership.test.js` 8/8 (отказ ничего не разрушает; смерть keeper'а; осиротевшая своя публикация; чужой hostname; ограниченное время под конкуренцией) | green |
| G15 | FIX-02 | Идентичность защищаемого ресурса — канонический `memory_root`, а не `data_dir`; alias не обходит исключение | `fix-02-v1-ownership.test.js` (общий `lock_path`/`endpoint` при разных `data_dir`; junction = одна идентичность; журнал через alias закрывает канонический путь) | green |

Статус T1 в предыдущей редакции матрицы был заявлен по текущему набору тестов; независимое
ревью 2026-09-11 подтвердило прохождение тестов, но отметило, что тест T1 меняет
диагностические metadata и не проверяет независимую гибель keeper'а при живом владельце. Этот
сценарий закрыт отдельной строкой U1. Строки U1/U2 означают «положительные регрессии проходят
на исправленном коде» и не являются приёмкой: блок остаётся `awaiting-review` до независимой
проверки (см. `issues/FIX-02-…md`, `issues/FIX-06-…md`).

RED для U1/U2 (до-фиксовое поведение, восстановленное в TEMP-копии):
`evidence/red-reconstruction-2026-09-11.cjs` → проба рецензента exit 0 (оба дефекта), регрессии
U1 3/6 и U2 6/7 падают; `evidence/red-2026-09-11-u1-u2.txt`. GREEN: проба exit 1
(`reproduced:false` для обоих), весь набор `node --test scripts/memory/tests/*.test.js` — 100/100.

Ревизия 2026-09-12 (после пятого независимого ревью): добавлены строки V1 и G15, набор —
108/108. RED берётся не из текстовой правки, а из ревизии в git (`ece1b24`):
`evidence/red-reconstruction-2026-09-12.cjs` восстанавливает `ipc-lock.js`, `lock-keeper.cjs` и
`writer.js` в TEMP-копию и явно возвращает прежнюю идентичность ресурса (без канонизации, файл
владения в `data_dir`), после чего проба рецензента даёт exit 0 (V1 воспроизведён), а новые
регрессии падают 7/8 на поведении (`red-2026-09-12-v1-g15.txt`). На исправленном дереве та же
проба **не завершается** (exit 2, ошибка harness-а): точки «публикация владельцем», которую она
перехватывает, в протоколе больше нет. Это наблюдение, а не приёмка —
`evidence/review-2026-09-12-probe-observations.txt`; вердикт по блоку выносит независимая приёмка.

Открытое наблюдение (не исправление): в одном параллельном прогоне до правок процесс `save.js`
оставался жив несколько минут, удерживая журнал очереди индексатора; причина не локализована,
наблюдение не воспроизвелось в пяти последующих прогонах. Все ожидания пути записи ограничены по
построению; добавлен тест «конкуренты завершаются за ограниченное время», чтобы будущее зависание
падало тестом. Подробности — в `issues/FIX-02-writer-lock-ownership.md`.

## Дополнительные зоны

После закрытия воспроизведённых сценариев отдельно проверяются: непрерывный drain очереди,
durable capture до выхода hook, webhook 2xx/persisted, doctor endpoints, hook подключённого
проекта, git sync/upstream, параллельный writer/indexer, расширенный Figma-контракт и restore.
Docker/Activepieces/Khoj/Figma/второй ПК отмечаются `live`, если их нельзя честно проверить
в текущей среде. Итог исполнителя — `awaiting-review`; `READY` выставляет только независимая приёмка.

