# SUMMARY — FIX-тикеты доработки System2 (2026-09-09)

Пакет составлен автором+исполнителем (Sonnet) по актуальному заданию
[SONNET-PROMPT.md](../SONNET-PROMPT.md) и результатам аудита
[evidence/CORE-AUDIT-2026-09-09.md](../evidence/CORE-AUDIT-2026-09-09.md)
(ревизия `69a257c`; все 10 дефектов воспроизведены на этой машине).

Статусы: `planned` — нарезано; `in-progress` — исполняется; `awaiting-review` — локально готово, ждёт внешней приёмки;
`awaiting-validation` — проверка невозможна из-за внешней зависимости/доступа.

| FIX | Содержание | Дефекты | Исходные SC/R | Блокируется | Статус |
|---|---|---|---|---|---|
| [FIX-01](FIX-01-writer-batch-and-recovery.md) | Writer: пакетная запись, восстановление intent/частичной записи; R1 идентичность по полному содержимому, R4 CRLF-идемпотентность | F01, F02 (+R1, R4) | SC-08 (R03, R07) | — | awaiting-review |
| [FIX-02](FIX-02-writer-lock-ownership.md) | Writer: владение блокировкой, steal осиротевших, liveness по pid; R5 publish-verify/освобождение своего поколения, R6 конфликт под блокировкой | F03 (+R5, R6) | SC-08 (R07) | — | awaiting-review |
| [FIX-03](FIX-03-search-project-isolation.md) | Поиск: изоляция проектов по записям в общих файлах; R2 перитмическая верификация Khoj, R3 CRLF-разбор и строгая изоляция scope | F04 (+R2, R3) | SC-05/08 (R04, R05) | — | awaiting-review |
| [FIX-04](FIX-04-immediate-save-durability.md) | Немедленное сохранение без сервисов; fsync; границы durability; SPEC/контракт; crash-точки реального writer, настоящий remote-конфликт | — (требование ревью Opus 2026-09-09) | SC-08, R03, R05 | FIX-01 | awaiting-review |
| [FIX-05](FIX-05-queue-ownership.md) | Очередь: владение задачей, защита подтверждённого результата | F08 | SC-07 (R07) | — | planned |
| [FIX-06](FIX-06-queue-recapture-and-corrupt-tail.md) | Очередь/журналы: повторный capture без конфликта по времени; оборванный JSONL-хвост; карантин | F09, F10 | SC-07 (R07) | FIX-05 (общий jsonl.js) | planned |
| [FIX-07](FIX-07-index-task-recovery.md) | Индекс: повторная постановка задач, reconcile, возобновление in-flight | F05, F06 | SC-10 (R08) | FIX-01, FIX-06 | planned |
| [FIX-08](FIX-08-index-honest-status.md) | Индекс: indexed только при успехе всех задач события | F07 | SC-10 (R08) | FIX-07 | planned |
| [FIX-09](FIX-09-webhook-and-superseded-contracts.md) | Контракты: webhook 2xx ≠ persisted; superseded vs удаление | — (уточнение контрактов) | SC-09, SC-03/10 | — | planned |
| [FIX-10](FIX-10-reporting-status-alignment.md) | Отчётность: согласование статусов SC-01…18, SUMMARY, RELEASE-REPORT | — (дефекты отчётности) | R12, R01 | FIX-01…08 (фактические статусы) | planned |
| [FIX-11](FIX-11-environment-and-portability.md) | Среда/переносимость: ENVIRONMENT, hooks на клоне, Figma, маршруты, внешние блокировки | — (проверка среды) | SC-01/02/04/06/11–15/17 | FIX-10 | planned |

## Доработка по независимому ревью (2026-09-09, ревизия `a8574f6`)

Первая внешняя приёмка блока F01–F04 ([WRITER-INDEPENDENT-REVIEW.md](../WRITER-INDEPENDENT-REVIEW.md))
вернула блок НЕ принятым с замечаниями R1–R6 (P1×4, P2) и пятью недостатками доказательств.
Исправления внесены в рамках существующих тикетов отдельными scoped-коммитами:

- `eb06524` FIX-01 (R1 идентичность записи по полному содержимому; R4 CRLF-идемпотентность) — тесты 10/10.
- `8f4809a` FIX-02 (R5 publish-verify владельца lock, освобождение своего поколения; R6 конфликт под блокировкой) — тесты 9/9, RED 3 падения на 5fe4a7b.
- `1b6e1e9` FIX-03 (R2 перитмическая верификация хита Khoj; R3 CRLF-разбор, неизвестный scope закрыт для проектов) — тесты 13/13, RED 8 падений на aa2bfa5.
- `a8574f6` FIX-04 (доказательства: crash-точки реального writer под `SYSTEM2_CRASH_AT`, настоящий content-конфликт при pull; сужены claims power-loss/порядка queueIndex/FIX-07; роль audit-harness уточнена) — тесты 7/7, RED на 9c47f8e.

Полный набор: `node --test scripts/memory/tests/*.test.js` → **39/39**. Пробы ревью
(`evidence/writer-review-probes.cjs`) на ревизии `a8574f6` ожидаемо дают `reproduced:false`
по R1–R6 (код 1). Обновлённые [WRITER-REVIEW.md](../WRITER-REVIEW.md) и матрица
[SC-REVIEW-MATRIX.md](../../SC-REVIEW-MATRIX.md) поданы на повторную независимую приёмку;
самому рубеж не закрывается. F05–F10 остаются вне рамок этого отказа — очередь FIX-05…08.

## Доработка по независимому ревью, раунд 2 (2026-09-09, ревизия `980d331`)

Второе внешнее ревью ([WRITER-INDEPENDENT-REVIEW-ROUND2.md](../WRITER-INDEPENDENT-REVIEW-ROUND2.md))
вернуло блок НЕ принятым с замечаниями S1–S3 (P1×2, P2). Исправления внесены в рамках
существующих тикетов отдельными scoped-коммитами:

- `18924d9` FIX-01 (S2 однозначная сериализация полей frontmatter: `singleLine` для source/evidence/supersedes, reject CR/LF, statement без строк `---`, event_id однострочный, round-trip всех полей без потерь; S3 канонизация EOL до hash: LF≡CRLF → идемпотентный повтор, содержательное различие остаётся CONFLICT) — тесты 18/18, RED на 980d331 (6 падений).
- `72e3163` FIX-02 (S1 карантин-восстановление lock: устаревшее решение не выполняет разрушающее действие по каноническому пути — occupant атомарно перемещается в уникальный карантин, проверяется, verified-карантин удаляется, живое поколение возвращается на место) — тесты 12/12, RED на 980d331 (2 падения: ребёнок-реклаймер удалял живой lock родителя и входил в секцию).
- `c258c75` FIX-03 (S2 read-side fail-closed: `parseFields` → `{fields, duplicated}`, дубликат ключа не выбирается (нет last-wins); дубликат scope не открывает запись проекту, дубликат status → `unknown`) — тесты 15/15, RED на 980d331 (2 падения).

Полный набор: `node --test scripts/memory/tests/*.test.js` → **52/52**. Пробы ревью
(`evidence/writer-review-round2.cjs`) на ревизии `c258c75`: `reproduced:false` по S1–S3
(код 1). Исторический результат (980d331, reproduced:true ×3) сохранён рядом
(`evidence/writer-review-round2-results.pre-round2-fix.json`). Обновлённые
[WRITER-REVIEW.md](../WRITER-REVIEW.md) и матрица [SC-REVIEW-MATRIX.md](../../SC-REVIEW-MATRIX.md)
поданы на третью внешнюю приёмку; самому рубеж не закрывается. F05–F10 — очередь FIX-05…08.

## Порядок исполнения

Блок 1 (FIX-01…04) — первый приоритет; после него обязательный **внешний рубеж**: `WRITER-REVIEW.md`
(awaiting-review) передаётся пользователю для независимого проверяющего; до положительного результата —
без миграции настоящей памяти и без подключения исправленного writer к рабочемуу потоку.
Блоки 2–4 (FIX-05…11) выполняются на синтетических данных/изолированных клонах без ожидания ревью.
Все локальные проверки — `node --test scripts/memory/tests/`; внешние live-проверки — awaiting-validation с причинами.
