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
---
status: confirmed
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: commit L04-04: "ожидание reviveMs удерживало владение примерно 32 с на каждый commit и не давало watch достичь idle"
event_id: evt_9ff828f6e482
---

## Ожидание reviveMs по унаследованному терминальному failed удерживает владение примерно 32 с на каждый commit и не даёт watch достичь idle.
---
status: confirmed
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: summary/commit L04-04: 'Writer отвечает 409, шаг write ронял run, flow-response не рождался, отправитель видел от платформы 408 и повторял: живой цикл дал 5 прогонов AI на одно событие и ложный терминальный failed.'
event_id: evt_0006d3a39705
---

## В systemqwen повтор уже сохранённого event_id с другим содержимым не эквивалентен сохранению: шаг write ронял run при ответе Writer 409, flow-response не рождался, отправитель получал от платформы 408 и повторял, что давало живой цикл из 5 прогонов AI на одно событие и ложный терминальный failed.
---
status: superseded
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: summary: '409 writer'а становится коррелированным conflict, подтверждённый persisted — persisted, всё осталь��ое (401, 5xx, транспорт, неожиданное тело) роняет шаг: run падает, отправитель получает 408 и повторяет. Ни один неизвестный исход не становится подтверждённым успехом'
event_id: evt_6dacc432c641
superseded_by: evt_80ec195549d7
---

## Ни один неизвестный исход не должен становиться подтверждённым успехом: подтверждённым persisted становится только 409 writer'а как коррелированный conflict, всё остальное (401, 5xx, транспорт, неожиданное тело) роняет шаг — run падает, отправитель получает 408 и повторяет.
---
status: confirmed
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: «Прежнее зависание в fix-04 не воспроизвелось — его удерживал процесс предыдущего прогона, а не код; тикет и отчёт обновлены по факту»
event_id: evt_7c95328725a7
---

## Зависание прогона в fix-04 вызывал процесс предыдущего прогона, удерживавший ресурс, а не код: при чистом окружении оно не воспроизводится, поэтому перед диагностикой зависаний нужно исключать осиротевшие процессы прошлого запуска.
---
status: observation
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: Обрыв до acknowledgement: мост остановлен, отправитель дождался 408 и оставил событие повторяемым, после перезапуска — delivered.
event_id: evt_7e10d6cfc928
---

## Обрыв связи до acknowledgement не приводит к потере события: мост останавливается, отправитель получает 408, событие остаётся повторяемым и доставляется (delivered) после перезапуска; доставка — at-least-once, а не exactly-once.
---
status: observation
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: deadline 0.877 с, failed за 32.438 с при окне больше reviveMs, busy 0.200 с. Событие с истёкшим окном само не доставляется.
event_id: evt_7e10d6cfc928
---

## Пределы watch: deadline срабатывает за 0.877 с, failed наступает за 32.438 с при окне больше reviveMs, busy — за 0.200 с; событие с истёкшим окном само не доставляется и требует повторной отправки.
---
status: confirmed
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: Пробная запись, порождённая искусственным seed-событием evt_l0404conflict1 при подготовке детерминированного конфликта, удалена: её event_id не может быть получен из контракта (не hex и не выводится из commit)
event_id: evt_b1aa44d74de0
---

## В основную память проекта попадают только записи, чей event_id выводится из контракта (hex или из коммита); записи, порождённые искусственными seed-событиями с непроизводным event_id, из основной памяти удаляются.
---
status: confirmed
category: gotchas
scope: systemqwen
source: docs/memory-contract.md и reports/CHAT-04-RESULT.md (L04-04), 2026-09-14
evidence: Исправление записи event_id evt_6dacc432c641 (gotchas/writer-entries.md): прежняя формулировка сближала 409/conflict с persisted. Основание — docs/memory-contract.md (409 → коррелированный conflict, подтверждённый persisted → persisted, всё остальное — отказ шага) и живой повтор L04-04 (reports/CHAT-04-RESULT.md: outcome=conflict при неизменной памяти, outcome=persisted при записи)
event_id: evt_80ec195549d7
supersedes: evt_6dacc432c641
---

## Ни один неизвестный исход не становится подтверждённым успехом: подтверждённым успехом записи считается только коррелированный терминальный ответ writer, а именно `persisted` от подтверждённой записи; `409` — отдельный терминальный исход `conflict` (отказ writer, память не меняется, повтор бессмыслен), а не `persisted`; всё остальное (401, 5xx, транспорт, неожиданное тело) роняет шаг — run падает, отправитель получает 408 и повторяет.
---
status: confirmed
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: Прежняя запись evt_6dacc432c641 сближала коррелированный conflict (409) с подтверждённым persisted
event_id: evt_51575e94224b
---

## Коррелированный conflict (HTTP 409) не следует сближать с подтверждённым persisted: это разные состояния, и их смешение в одной записи памяти признано ошибочным.
---
status: observation
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: commit L05-04: снято «после подтверждения» в description навыка start и устаревшее утверждение о неопубликованном a499e81
event_id: evt_0e17e6c13b1c
---

## Описания навыков и документация не должны содержать шагов, которых нет в реализации (например, «после подтверждения»), и ссылок на неопубликованные коммиты — при расхождении текста с фактическим поведением/состоянием репозитория описание правится.
---
status: observation
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: evt_3a12c58da8c3, kind: commit, summary: "L05-03: маршруты dev/sites/marketing проверены живьём; незакрытый критерий живой Figma зафиксирован"
event_id: evt_3a12c58da8c3
---

## Критерий приёмки с живой Figma (live Figma) по задаче L05-03 остаётся незакрытым, тогда как маршруты dev/sites/marketing уже проверены на живом стенде; закрытие задачи требует отдельной проверки Figma-критерия.
---
status: observation
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: evt_3289610b82f6: 'В трёх из них сохраняется дефект кодировки: U+FFFD на месте одного символа (например, в тексте коммита L05-01 «старые передачи» записано как «старые пе??едачи» при корректном исходном сообщении)'
event_id: evt_3289610b82f6
---

## Живой цикл памяти может повреждать один символ в тексте записи, заменяя его на U+FFFD; дефект воспроизвёлся в трёх из четырёх записей по коммитам фазы 5 (L05-04, L05-01, L05-03), причина не установлена, записи не переписывались — при чтении таких записей нельзя считать искажённый символ достоверным.
---
status: observation
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: summary: "L05: отчёт — записи цикла по коммитам фазы 5, стадия индекса и дефект кодировки U+FFFD"
event_id: evt_eb1a9e1be03e
---

## В проекте systemqwen фиксируется дефект кодировки с символом замены U+FFFD, возникающий при обработке текста; при работе с выводом и индексацией следует проверять и нормализовать кодировку, чтобы избежать потери символов.
---
status: observation
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: evt_e15b1df50571, commit summary: '... дефект U+FFFD открыт'
event_id: evt_e15b1df50571
---

## В проекте systemqwen открыт дефект, связанный с символом замены U+FFFD; он фиксируется при передаче фазы 5 и остаётся неустранённым.
---
status: observation
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: evt_99ebd34b8471, kind: commit: 'L06: фаза 6 — приёмка фазы 5 зафиксирована, второй ПК недоступен (blocked), restore проверен в отдельном каталоге'
event_id: evt_99ebd34b8471
---

## Проверка restore для L06 выполняется в отдельном каталоге, так как второй ПК недоступен (blocked), то есть восстановление валидируется локально, без второго стенда.
---
status: observation
category: gotchas
scope: systemqwen
source: activepieces-flow
evidence: Первая редакция отчёта читала append-only журналы как текущее состояние («123 события, 45 pending»): числа пересчитаны по последней записи на идентификатор
event_id: evt_93478b794910
---

## Append-only journals must not be read as current state: counters like event/pending totals must be recomputed from the last record per identifier, otherwise stale cumulative numbers are reported as live state.
---
status: observation
category: gotchas
scope: system-of-site
source: Скриншот пользователя и read-only проверка протоколов, 2026-10-05
evidence: system-of-site/.system2/decision-journal/964bb7a84733141a637e8016.json; docs/site-project/reports/B08-VPS-PREPARATION-20261005.md
event_id: journal_system-of-site_964bb7a84733141a637e8016
---

## VPS System of Site, 2026-10-05: панель провайдера показывает активную аренду и найденную VM, но не получает её состояние: Proxmox-нода не отвечает. Повторный SSH banner-read и HTTP probe timeout. Пока это отказ диагностики провайдера; состояние VM и точная причина SSH не установлены. Перед развёртыванием требуется восстановление доступа провайдером.
---
status: observation
category: gotchas
scope: system-of-site
source: docs/site-project/reports/B08-MASS-TESTS-20261006.md; synthetic evidence and app 8bfdeb1; 2026-10-06
evidence: docs/site-project/reports/B08-MASS-TESTS-20261006.md; synthetic evidence; app 8bfdeb1c92365c3fbb5d1608177f1c5b06e3a161
event_id: journal_system-of-site_231cc63c84380aa7d24d62e6
---

## B08 mass tests: 326 unit tests, 112 offline routes and 896 rejected invalid mutations pass; 53 completed live attempts include 21 passes and 32 failures across fixes, with 275 provider responses. App 8bfdeb1 removes contact data from model context and fixes late GET overwriting a running analysis; forced-delay desktop/mobile browser routes pass. Design and consultation full routes, false publication-review refusals and roughly 30-second median group analysis still prevent stable acceptance.
