---
status: confirmed
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: commit evt_e33c5558759f: "Экспорт снят заново с живого flow; токен моста остаётся плейсхолдером, значение не коммитится".
event_id: evt_e33c5558759f
---

## Токен рабочего моста 8643 остаётся плейсхолдером в репозитории: значение не коммитится, экспорт flow снимается заново с живого flow после каждой смены моста.
---
status: confirmed
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: Событие evt_2cb2c33b2cbf: run упал до flow-response, дал HTTP 408, очередь объявила событие терминально failed с первой попытки; после добавления 408 к повторяемым (429/5xx) тот же прогон дал один запрос и delivered.
event_id: evt_2cb2c33b2cbf
---

## HTTP 408 от sync webhook платформы обязан входить в список повторяемых статусов наряду с 429/5xx: иначе очередь помечает событие терминально failed с первой попытки, хотя контракт README и ограничение L03-03 требуют повтора.
---
status: confirmed
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: Событие evt_2cb2c33b2cbf: отправитель обрывал запрос на 5 с при WEBHOOK_TIMEOUT_SECONDS = 30 с, run в 6 с дал три п��раллельных прогона, три реальных write, ноль подтверждений и одну запись в памяти; таймаут берётся из delivery.timeout_ms со значением 35000 > 30 с.
event_id: evt_2cb2c33b2cbf
---

## Таймаут отправителя обязан быть строго больше WEBHOOK_TIMEOUT_SECONDS платформы (30 с): при фиксированных 5 с отправитель обрывает запрос раньше ответа, что порождает параллельные повторные прогоны, дублирующие write, и ложный статус failed при уже сохранённом событии.
