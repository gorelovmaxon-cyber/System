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
---
status: confirmed
category: facts
scope: system-of-site
source: docs/site-project/reports/B03-RESULT.md and B03-EVIDENCE, executor proof 2026-09-27
evidence: B03-RESULT and B03-EVIDENCE: automated tests, Edge screenshots, installation-checks
event_id: journal_system-of-site_65a0155cc74c6dcea110b6ef
---

## B03 isolated React app implemented without AI; app ebaee98, 19 Python tests including 8 B02 and 13 Edge checks pass. Full bundle restored with fresh dependencies. Live B03 CRM payload awaits laptop validation; independent acceptance not claimed.
---
status: confirmed
category: facts
scope: system-of-site
source: docs/site-project/reports/B03-RESULT.md B03-05 section and B03-EVIDENCE/B03-05, executor checks 2026-09-27
evidence: B03-EVIDENCE/B03-05 browser-checks, screenshot, Python tests, audit and fresh installation report
event_id: journal_system-of-site_981553b85080f60a0c6fa756
---

## B03-05 app 2519e88 separates unsaved brief overrides from confirmed conversation; upload/delete/reconnect/409 and stale responses preserve edits. 19 Python and 22 Edge checks pass. Vite 7.3.6 build and current npm audit pass. Corrected full bundle restored; independent review and live laptop CRM validation remain pending.
---
status: confirmed
category: facts
scope: system-of-site
source: docs/site-project/reports/B04-ROBUSTNESS-REVIEW.md; 2026-09-29
evidence: Повторный unittest: 159 OK; git bundle verify и SHA-256 совпали с отчётом; протокол содержит 53 уникальных turn_id и три confirmed.
event_id: journal_system-of-site_3c66d99b150bd0e9fb923362
---

## Независимая локальная проверка B04 app af3d0ba приняла исправления: 159 Python OK, совпали SHA bundle и протокола, 53 уникальных HTTP-хода и три confirmed; текущая доставка в EspoCRM и качество живой модели остаются открытыми.
---
status: confirmed
category: facts
scope: systemqwen
source: Беседа 2026-10-08, последнее поручение пользователя «Заверши блок ROLES», пункт 1: переданный внешний вердикт; .scratch/decision-journal/RESULT.md#roles-external-verdict.
evidence: .scratch/decision-journal/RESULT.md#roles-external-verdict; сообщение пользователя в беседе 2026-10-08, пункт 1, принятая ревизия 73a70fa.
event_id: journal_systemqwen_13947f838aee699cb456fe54
---

## Пользователь передал внешний независимый вердикт: ROLES-01–03 приняты; исправление ROLES-03 проверено на 73a70fa089887946676d72bbb90c53d06d14eb1f. Статусы done фиксируют полученную внешнюю приёмку, не самоприёмку исполнителя. Окончательная независимая проверка завершения ROLES-04/05 остаётся отдельной.
---
status: confirmed
category: facts
scope: systemqwen
source: Беседа 2026-10-12, разрешённый SITE-BUILD-02–04
evidence: .scratch/site-build/FOLLOWUP-RESULT.md; .scratch/site-build/evidence/client-discovery.md; .scratch/site-build/evidence/browser-qa.json; .scratch/site-build/evidence/memory-tests.txt
event_id: journal_systemqwen_eb40d0662dcec19655fbe396
---

## SITE-BUILD-02–04 (2026-10-12): уточнён контракт роли/режима до фаз, убран запуск по таймеру; init-project с client claude-code добавляет тонкий адаптер site-build с идемпотентностью и защитой пользовательской команды. Навык обнаружен встроенным skills в новой сессии Claude. Изолированная живая проба: планирование, статический сайт с диалогом, новая сессия правки радиуса без нового интервью; 209 тестов и браузерная QA восьми ширин PASS. Генерация через Claude API не проверялась. Первый снимок содержал чужие scope; он очищен, ограничение чтения памяти уточнено. Полные evidence и ограничения — .scratch/site-build/FOLLOWUP-RESULT.md.
