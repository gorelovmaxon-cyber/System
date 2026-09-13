# L04-00 — Таймаут отправителя против таймаута синхронного webhook Activepieces

**What to build:** Событие, получившее от Activepieces `HTTP 408` (run завершился без flow-response), остаётся повторяемым, а не становится терминально `failed` с первой попытки; отправитель ждёт детерминированный ответ платформы дольше её `WEBHOOK_TIMEOUT_SECONDS`, поэтому долгий, но успешный run подтверждается коррелированным ack, а не повторной параллельной доставкой.
**Requirement IDs:** R06, R07; SC-09, FIX-09 (деталь контракта подтверждения)
**Blocked by:** none
**Status:** awaiting-review
**Перед началом работы:** Открой `D:\SystemTheBest\System`, проверь корень Git и текущие изменения.

## Контекст

Открытое ограничение L03-03 прямо записано в его тикете и отчёте: упавший run не
порождает flow-response, вызывающий доходит до `WEBHOOK_TIMEOUT_SECONDS` = 30 с и
получает `408`, «что должно считаться retryable». `services/activepieces/flows/README.md`
повторяет то же требование к отправителю. Фактический `scripts/memory/deliver.js`
считал повторяемыми только `429` и `5xx`, то есть документированный контракт и
реализация расходились. Пользователь назвал это первой проверкой фазы 4.

Второй разрыв — согласованность таймаутов. `deliverEvent` обрывал запрос на
фиксированных 5 с, тогда как платформа отвечает по своим 30 с. Отправитель не мог
увидеть исход run длиннее 5 с: подтверждение не доходило никогда, событие оставалось
в очереди, а каждый повтор порождал ещё один параллельный run.

## План и неизвестное

- **Подтверждено измерением (2026-09-13, HEAD a499e81):** стенд с настоящими
  `DurableQueue` + `deliverEvent` на fixture-памяти воспроизводит оба дефекта.
  `408` → `attempts=1`, `status=failed` (повторов нет). Run в 6 с → три запроса к
  платформе, три реальных `write`, **ноль** подтверждений, `status=failed`, при
  этом в памяти fixture уже лежит ровно одна запись. Evidence:
  [l04-00-timeout-consistency-before-fix-2026-09-13.json](../evidence/l04-00-timeout-consistency-before-fix-2026-09-13.json).
- **Основной путь:** минимальная правка `deliver.js` — `408` в списке повторяемых и
  таймаут из `delivery.timeout_ms` с поставляемым значением больше 30 с; архитектура
  очереди и контракт ack не меняются.
- **Рубеж пересмотра → альтернатива:** если бы корректное поведение требовало менять
  саму очередь (например, дедупликацию параллельных run), это вышло бы за границу
  тикета и потребовало отдельного решения. Не потребовалось: причина была целиком в
  отправителе.

## Файлы для изменения

- [scripts/memory/deliver.js](scripts/memory/deliver.js) — существующий; `retryableStatus`, `timeoutMs`, `DEFAULT_TIMEOUT_MS`
- [scripts/memory/tests/l04-00-delivery-timeout.test.js](scripts/memory/tests/l04-00-delivery-timeout.test.js) — новый; регрессия
- [config/system.example.json](config/system.example.json) — существующий; `delivery.timeout_ms`

## Файлы для чтения (контекст)

- [services/activepieces/flows/README.md](services/activepieces/flows/README.md) — контракт ack и заявление о `408`
- [docs/memory-contract.md](docs/memory-contract.md) — «Подтверждение доставки через webhook»
- [scripts/memory/queue.js](scripts/memory/queue.js) — как `retryable` влияет на терминальность записи
- [.scratch/system-launch/evidence/l04-00-timeout-consistency.cjs](../evidence/l04-00-timeout-consistency.cjs) — воспроизведение

## ⚠️ Файлы НЕЛЬЗЯ трогать

- `.claude/memory` — проверки идут на fixture в `%TEMP%`; основная память не меняется.
- Секретные значения webhook/connection/токенов — не коммитить и не печатать.
- `docs/memory-contract.md` и `services/activepieces/flows/README.md` — в этом тикете
  не правятся: их формулировки уже верны, расходилась реализация.

## Входные/выходные данные

Вход — событие SC-07 и HTTP-ответ синхронного webhook. Выход — результат доставки
`{ok, retryable, error|outcome}`. `408` и `429` и `5xx` → `retryable: true`; прочие
4xx (401/404/400) → `retryable: false`; коррелированный `{event_id,status:"persisted"|"no-pattern"}`
→ `ok: true`. Таймаут отправителя: `options.timeout_ms` → `config.delivery.timeout_ms`
→ `DEFAULT_TIMEOUT_MS` (35000).

## Алгоритм (шаг за шагом)

1. Воспроизвести оба дефекта на стенде с настоящей очередью и записать evidence.
2. Ввести `retryableStatus(status)`: `408`, `429`, `>= 500`.
3. Ввести `timeoutMs(options)`: явный параметр → конфигурация → поставляемое значение
   строго больше `WEBHOOK_TIMEOUT_SECONDS` = 30 с.
4. Регрессия: `408` повторяем на уровне `deliverEvent` и на уровне очереди; событие
   восстанавливается до `delivered` после `408`; `401` остаётся терминальным; таймаут
   берётся из конфигурации и явного параметра; поставляемое значение больше 30 с.
5. Повторить стенд после правки и сравнить с до-правкой: один запрос, одно
   подтверждение, одна запись.

## Критерии приёмки

- [x] `408` от sync webhook считается повторяемым, и очередь оставляет событие
      `pending` с назначенным повтором, а не `failed`. — стенд до/после и тест
- [x] Событие, получившее `408`, восстанавливается до `delivered` тем же
      коррелированным ответом без дубля в памяти. — тест «retried until the flow
      answers with a correlated terminal status»
- [x] Долгий (больше прежних 5 с) успешный run подтверждается с первой попытки:
      один запрос к платформе, одно подтверждение, одна запись. — стенд «после»
- [x] Таймаут отправителя берётся из `delivery.timeout_ms` и превышает
      `WEBHOOK_TIMEOUT_SECONDS` поставляемым значением. — конфиг + тест на 30 000 мс
- [x] Прочие 4xx не стали повторяемыми. — тест на `401`

## Проверки

**Среда и предпосылки:** Node.js 24, локально; внешний Activepieces не требуется —
стенд держит контракт платформы, настоящий `DurableQueue`, `deliverEvent` и
bridge+writer на fixture-памяти.
**Команды:**
`node .scratch/system-launch/evidence/l04-00-timeout-consistency.cjs` (до и после);
`node --test scripts/memory/tests/l04-00-delivery-timeout.test.js`;
`node --test scripts/memory/tests/*.test.js` — полный набор.
**Ожидаемый результат:** оба дефекта воспроизводимы до правки и отсутствуют после;
полный набор без падений.
**Данные и наблюдение:** fixture-память в `%TEMP%`, запись проверяется по числу
`event_id:` в `facts/writer-entries.md`; основная `.claude/memory` не участвует.
**Если проверка недоступна:** не применимо — проверка выполнена локально.

## Ограничения

Стенд имитирует контракт платформы, а не сам Activepieces; живая проверка того же
поведения входит в L04-02/L04-03. Поставляемое значение `35000` предполагает
неизменённый `WEBHOOK_TIMEOUT_SECONDS` = 30 с; при его повышении правится
`delivery.timeout_ms`.

## Как закончить

1. Diff и evidence — в [reports/CHAT-04-RESULT.md](../reports/CHAT-04-RESULT.md).
2. Отдельный scoped-коммит: `deliver.js`, тест, `config/system.example.json`,
   файл тикета.
3. `awaiting-review`; `done` ставит приёмщик.
