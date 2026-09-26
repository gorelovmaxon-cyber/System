---
status: observation
category: facts
scope: systemqwen
source: independent acceptance
evidence: .scratch/system-remediation/W1-REVIVE-AWAIT-REPORT-2026-09-12.md; independent W1/G12 tests 5/5; fix commit 30321e4
event_id: evt_system2_acceptance_w1_20260912
---

## 2026-09-12: W1 independently accepted; local core approved for staged service setup. Live Activepieces and Khoj validation remains pending.
---
status: observation
category: facts
scope: systemqwen
source: activepieces-flow
evidence: «Форма выхода HTTP-шага при продолжении после 409 — наблюдение probe-публикации на контролируемом событии плюс сверка с исходником piece-http 0.11.19. Ответ опубликованного flow на конфликтное событие сохранён дословно»
event_id: evt_7c95328725a7
---

## Форма выхода HTTP-шага при продолжении после 409 установлена наблюдением probe-публикации на контролируемом событии и сверена с исходником piece-http 0.11.19; ответ опубликованного flow на конфликтное событие сохранён дословно как эталон.
---
status: confirmed
category: facts
scope: systemqwen
source: activepieces-flow
evidence: evt_7433fae17dd5: 'Hook установлен штатным способом, обычный commit порождает одно durable-событие автоматически.'
event_id: evt_7433fae17dd5
---

## В проекте systemqwen hook регистрации событий установлен штатным способом, поэтому обычный commit автоматически порождает ровно одно durable-событие без ручного тикета.
---
status: confirmed
category: facts
scope: systemqwen
source: activepieces-flow
evidence: summary: "Живой трейс: commit → событие → Activepieces → AI → bridge → writer → indexer → Khoj → Git, состояния persisted/indexed различены"
event_id: evt_83763b7afdf0
---

## Живой трейс проекта проходит цепочку commit → событие → Activepieces → AI → bridge → writer → indexer → Khoj → Git, при этом состояния persisted и indexed различены.
---
status: confirmed
category: facts
scope: systemqwen
source: activepieces-flow
evidence: evt_9861052a0dfe (kind: commit), summary: "L06: диагностика очереди — 25 событий по одному на коммит, не 123; исправлены числа и статус приёмки фазы 4"
event_id: evt_9861052a0dfe
---

## Диагностика очереди в проекте systemqwen считает 25 событий — по одному на коммит; прежнее значение 123 было неверным, как и статус приёмки фазы 4, который исправлен в том же коммите.
---
status: confirmed
category: facts
scope: user
source: https://github.com/gorelovmaxon-cyber/Sait/blob/997bb710120a93f1792e55f849d56ee92a7d9984/docs/TRANSFER-CHECK-2026-09-21.md
evidence: docs/TRANSFER-CHECK-2026-09-21.md: npm run build успешно, из 176 уникальных путей /images/ и /video/ шесть отсутствовали в public; site commit 997bb710120a93f1792e55f849d56ee92a7d9984
event_id: evt_sw03_site_assets_997bb71
---

## В проверке сайта C-portfolio успешная сборка TypeScript/Vite сопровождалась шестью ссылками на отсутствующие статические изображения; наличие ассетов проверяется отдельно от сборки.
---
status: confirmed
category: facts
scope: system-of-site
source: system-of-site/docs/site-project/REQUIREMENTS.md, 2026-09-26
evidence: Таблица тарифов REQUIREMENTS.md от 2026-09-26 и B01-RESULT.md
event_id: journal_system-of-site_20c1f120a14faf2103e957c2
---

## Для расчёта B01 в System of Site ставка обычного блока Tilda — 3 500 ₽, FAQ — 1 500 ₽, дополнительного языка — 500 ₽ за блок; итоговый расчёт B01 ожидает утверждения Максимом.
