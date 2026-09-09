# SUMMARY — FIX-тикеты доработки System2 (2026-09-09)

Пакет составлен автором+исполнителем (Sonnet) по актуальному заданию
[SONNET-PROMPT.md](../SONNET-PROMPT.md) и результатам аудита
[evidence/CORE-AUDIT-2026-09-09.md](../evidence/CORE-AUDIT-2026-09-09.md)
(ревизия `69a257c`; все 10 дефектов воспроизведены на этой машине).

Статусы: `planned` — нарезано; `in-progress` — исполняется; `awaiting-review` — локально готово, ждёт внешней приёмки;
`awaiting-validation` — проверка невозможна из-за внешней зависимости/доступа.

| FIX | Содержание | Дефекты | Исходные SC/R | Блокируется | Статус |
|---|---|---|---|---|---|
| [FIX-01](FIX-01-writer-batch-and-recovery.md) | Writer: пакетная запись, восстановление intent/частичной записи | F01, F02 | SC-08 (R03, R07) | — | awaiting-review |
| [FIX-02](FIX-02-writer-lock-ownership.md) | Writer: владение блокировкой, steal осиротевших, liveness по pid | F03 | SC-08 (R07) | — | planned |
| [FIX-03](FIX-03-search-project-isolation.md) | Поиск: изоляция проектов по записям в общих файлах | F04 | SC-05/08 (R04, R05) | — | planned |
| [FIX-04](FIX-04-immediate-save-durability.md) | Немедленное сохранение без сервисов; fsync; границы durability; SPEC/контракт | — (требование ревью Opus 2026-09-09) | SC-08, R03, R05 | FIX-01 | planned |
| [FIX-05](FIX-05-queue-ownership.md) | Очередь: владение задачей, защита подтверждённого результата | F08 | SC-07 (R07) | — | planned |
| [FIX-06](FIX-06-queue-recapture-and-corrupt-tail.md) | Очередь/журналы: повторный capture без конфликта по времени; оборванный JSONL-хвост; карантин | F09, F10 | SC-07 (R07) | FIX-05 (общий jsonl.js) | planned |
| [FIX-07](FIX-07-index-task-recovery.md) | Индекс: повторная постановка задач, reconcile, возобновление in-flight | F05, F06 | SC-10 (R08) | FIX-01, FIX-06 | planned |
| [FIX-08](FIX-08-index-honest-status.md) | Индекс: indexed только при успехе всех задач события | F07 | SC-10 (R08) | FIX-07 | planned |
| [FIX-09](FIX-09-webhook-and-superseded-contracts.md) | Контракты: webhook 2xx ≠ persisted; superseded vs удаление | — (уточнение контрактов) | SC-09, SC-03/10 | — | planned |
| [FIX-10](FIX-10-reporting-status-alignment.md) | Отчётность: согласование статусов SC-01…18, SUMMARY, RELEASE-REPORT | — (дефекты отчётности) | R12, R01 | FIX-01…08 (фактические статусы) | planned |
| [FIX-11](FIX-11-environment-and-portability.md) | Среда/переносимость: ENVIRONMENT, hooks на клоне, Figma, маршруты, внешние блокировки | — (проверка среды) | SC-01/02/04/06/11–15/17 | FIX-10 | planned |

## Порядок исполнения

Блок 1 (FIX-01…04) — первый приоритет; после него обязательный **внешний рубеж**: `WRITER-REVIEW.md`
(awaiting-review) передаётся пользователю для независимого проверяющего; до положительного результата —
без миграции настоящей памяти и без подключения исправленного writer к рабочем�� потоку.
Блоки 2–4 (FIX-05…11) выполняются на синтетических данных/изолированных клонах без ожидания ревью.
Все локальные проверки — `node --test scripts/memory/tests/`; внешние live-проверки — awaiting-validation с причинами.
