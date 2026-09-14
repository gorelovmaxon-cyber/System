---
status: confirmed
category: decisions
scope: systemqwen
source: activepieces-flow
evidence: commit evt_e33c5558759f: шаг write опубликованной версии указывал на http://host.docker.internal:8644 (fixture-мост L03-03), переведён на рабочий мост 8643 и опубликован (publishedVersionId taybpPCJxVqCZpWYvLuYG).
event_id: evt_e33c5558759f
---

## Живой flow фазы 4 в systemqwen обязан работать через рабочий мост на порту 8643; fixture-мост L03-03 (http://host.docker.internal:8644) допустим только для фикстур и не должен использоваться в опубликованной версии flow.
---
status: confirmed
category: decisions
scope: systemqwen
source: activepieces-flow
evidence: commit L04-04: "watch --no-revive не держит владение унаследованным failed (F-04-2)"; "запись, отказавшая внутри текущего запуска, остаётся его собственным честным исходом failed (G12)"
event_id: evt_9ff828f6e482
---

## В режиме watch --no-revive терминальные failed, унаследованные от прежнего запуска, исключаются из actionable и не удерживают владение; запись, отказавшая внутри текущего запуска, остаётся собственным честным исходом failed (правило G12).
---
status: confirmed
category: decisions
scope: systemqwen
source: activepieces-flow
evidence: commit L04-04: 'Контракт подтверждения теперь знает третий терминальный статус `conflict`. Очередь прекращает автоматические повторы, а исход остаётся видимым через новое поле outcome; за persisted конфликт не выдаётся.'
event_id: evt_0006d3a39705
---

## Контракт подтверждения (ack) в systemqwen имеет три терминальных статуса, включая `conflict`: повтор event_id с другим содержимым не считается успешным сохранением, Writer отвечает 409, очередь прекращает автоматические повторы, исход доступен через поле outcome, а за persisted конфликт не выдаётся; неизвестный коррелированный статус остаётся повторяемым, поэтому худший случай деградирует к прежнему поведению без ложного подтверждения.
---
status: confirmed
category: decisions
scope: systemqwen
source: activepieces-flow
evidence: summary: 'Экспорт пересобран с живого flow, токен остаётся плейсхолдером. В docs/memory-contract.md механизм описан рядом с третьим терминальным статусом'
event_id: evt_6dacc432c641
---

## Экспорт flow пересобирается с живого flow, токен остаётся плейсхолдером; механизм конфликта записи документируется в docs/memory-contract.md рядом с третьим терминальным статусом.
---
status: confirmed
category: decisions
scope: systemqwen
source: activepieces-flow
evidence: summary: "Опубликованная версия flow переведена с fixture-моста L03-03 на рабочий 8643"
event_id: evt_83763b7afdf0
---

## Опубликованная версия flow переведена с fixture-моста L03-03 на рабочий мост на порту 8643.
