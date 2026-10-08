---
status: confirmed
category: patterns
scope: systemqwen
source: activepieces-flow
evidence: summary: 'Шаг write переведён на failureMode continue_4xx, между ним и ответом встал CODE-шаг classify_write, а return_persisted читает его выход. Классификатор различает ветви по форме выхода piece, а не по тексту ошибки'
event_id: evt_6dacc432c641
---

## В flow-части шаг write использует failureMode continue_4xx, после него стоит CODE-шаг classify_write, а return_persisted читает его выход; классификатор различает ветви по форме выхода piece, а не по тексту ошибки.
---
status: confirmed
category: patterns
scope: systemqwen
source: activepieces-flow
evidence: summary: 'продолжение после 4xx приходит как {response:{status,body},request:{body}}, успех — как {status,headers,body} без ключа response. Форма измерена probe-публикацией на контролируемом событии, а не взята из документации'
event_id: evt_6dacc432c641
---

## Продолжение после 4xx приходит как {response:{status,body},request:{body}}, а успех — как {status,headers,body} без ключа response; эту форму следует определять probe-публикацией на контролируемом событии, а не брать из документации.
---
status: observation
category: patterns
scope: systemqwen
source: activepieces-flow
evidence: «Одна уже была сохранена, две нет, поэтому один прогон проверяет обе ветви: conflict и persisted ... Число записей в памяти не изменилось — отвергнутые предложения не записаны, дублей нет»
event_id: evt_7c95328725a7
---

## Повторная доставка записей очереди, ставших терминальным failed при недоступном Activepieces, обрабатывается идемпотентно: ветвь conflict не пишет в память, отвергнутые предложения не сохраняются, дубли не создаются, поэтому один прогон на трёх записях проверяет обе ветви — conflict и persisted.
---
status: observation
category: patterns
scope: systemqwen
source: activepieces-flow
evidence: Отказ Khoj дал failed без ложного indexed, после восстановления — indexed и находится поиском.
event_id: evt_7e10d6cfc928
---

## Отказ Khoj фиксируется как failed без ложного статуса indexed; после восстановления событие получает indexed и находится поиском.
---
status: confirmed
category: patterns
scope: systemqwen
source: activepieces-flow
evidence: evt_6dacc432c641 отмечена superseded со ссылкой superseded_by, исправленная формулировка записана как evt_80ec195549d7 со связью supersedes; старый текст сохранён без перезаписи
event_id: evt_51575e94224b
---

## Исправление ранее записанного знания в память проекта оформляется как новая запись штатным writer'ом (save.js) со связью supersedes, а старая запись помечается superseded со ссылкой superseded_by на новый event_id; старый текст сохраняется без перезаписи.
---
status: observation
category: patterns
scope: systemqwen
source: activepieces-flow
evidence: commit evt_e8c42d66a6a2, summary: "L06: очередь доставлена полностью — conflict как доказанная идемпотентность, цикл замыкается через no-pattern"
event_id: evt_e8c42d66a6a2
---

## В конвейере System2 конфликт между событием и уже сохранённой памятью трактуется как доказательство идемпотентности, а цикл обработки очереди замыкается при получении результата no-pattern.
---
status: observation
category: patterns
scope: systemqwen
source: activepieces-flow
evidence: Состояние процессов обновлено после контролируемого восстановления (Docker/Activepieces/bridge подняты), а не оставлено снимком на момент отказа
event_id: evt_93478b794910
---

## State descriptions in reports must reflect the environment after controlled recovery (Docker/Activepieces/bridge brought back up), not a snapshot frozen at the moment of failure.
---
status: observation
category: patterns
scope: system-of-site
source: B10-CONSENT-SESSION-HANDOFF-20261008; browser_b10_private_draft and browser_b10_user_flow evidence; affected test output 2026-10-08
evidence: Addressed 141 tests PASS; browser_b10_private_draft and browser_b10_user_flow PASS at 1440/390; code diff over a3b1fcb. Overall final check reported separately in the handoff.
event_id: journal_system-of-site_10168bdf0c7139e9b5355ed5
---

## B10 completion continues Opus changes on a3b1fcb: page-memory name/phone/email before consent, latest-consent retries, consent recheck before attachment registration, peer rate and atomic live-session ceiling. Attachment quota counts registered bytes only. Turn-state route already checked ownership via history before 4d5078f. Browser form and full flow PASS at 1440/390; affected 141 tests PASS. Linux read-only verification remains open; no paid AI calls or main-app changes.
---
status: confirmed
category: patterns
scope: system-of-site
source: User unified release task 2026-10-08, verified local integration
evidence: docs/site-project/reports/UNIFIED-VPS-RELEASE-20261008.md; UNIFIED-VPS-MIGRATION-20261008.json; app fd6f80b
event_id: journal_system-of-site_3b67a50ac1c10f723888d1a9
---

## Unified VPS app fd6f80b continues d234f04 with the complete accepted c3ddce2 diff. Final local check passed 602 tests. Real working SQLite backup copies migrated 15 to 18 and 17 to 18 with all pre-existing rows and columns unchanged; originals unchanged. Linux service permissions and real server acceptance remain open.
