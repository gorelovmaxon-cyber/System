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
---
status: observation
category: decisions
scope: systemqwen
source: activepieces-flow
evidence: HANDOFF дополнен коротким актуальным статусом: фаза 4 закончена по факту и ждёт приёмки, ограничение «статус не равен приёмке» указано явно; Знание о 409 живёт в docs/memory-contract.md и в тикете L04-04
event_id: evt_b1aa44d74de0
---

## За��ершение фазы по факту не равно её приёмке: ограничение «статус не равен приёмке» фиксируется явно в HANDOFF, а знание о конфликте 409 хранится в docs/memory-contract.md и тикете L04-04.
---
status: confirmed
category: decisions
scope: systemqwen
source: activepieces-flow
evidence: commit evt_ae5e7bea447b: 'в основную память попадают только записи, чей event_id выводится из контракта, — искусственный seed-идентификатор из памяти удаляется' (записи evt_7433fae17dd5, evt_83763b7afdf0, evt_7e10d6cfc928, evt_b1aa44d74de0)
event_id: evt_ae5e7bea447b
---

## В основную память проекта попадают только записи, чей event_id выводится из контракта; искусственный seed-идентификатор из памяти удаляется.
---
status: observation
category: decisions
scope: systemqwen
source: activepieces-flow
evidence: commit L05-01: "push в согласованных границах без нового вопроса; старые пе��едачи помечены историческими"
event_id: evt_95bec4016b3d
---

## В проекте systemqwen push в согласованных границах выполняется без нового уточняющего вопроса; устаревшие передачи помечаются как исторические.
---
status: observation
category: decisions
scope: systemqwen
source: activepieces-flow
evidence: evt_e15b1df50571, commit summary: 'L05: передача фазы 5 — Figma исключена, GPT-проверка Astra, покрытие маршрутов, дефект U+FFFD открыт'
event_id: evt_e15b1df50571
---

## В проекте systemqwen Figma исключена из процесса: дизайн-артефакты Figma не используются при передаче фазы 5.
---
status: observation
category: decisions
scope: systemqwen
source: activepieces-flow
evidence: Утверждение «самонаведённый цикл замыкается сам» опровергнуто продолжением живой цепочки: по девяти коммитам памяти persisted 6, no-pattern 3
event_id: evt_93478b794910
---

## The claim that the self-guided memory cycle closes itself is refuted: the live chain continues, with persisted 6 and no-pattern 3 across nine memory commits.
---
status: confirmed
category: decisions
scope: system-of-site
source: system-of-site/docs/site-project/REQUIREMENTS.md, 2026-09-26
evidence: Прямое пожелание в REQUIREMENTS.md, раздел Формат консультации и демо B01, 2026-09-26
event_id: journal_system-of-site_2606a50d2d9da23b047d78da
---

## Для консультанта System of Site Максим предпочитает преимущественно вопросы с выбором, сохраняя свободный ввод, свой вариант и возможность ответить «не знаю».
---
status: confirmed
category: decisions
scope: system-of-site
source: system-of-site/docs/site-project/REQUIREMENTS.md, 2026-09-26
evidence: REQUIREMENTS.md и B01-RESULT.md, 2026-09-26
event_id: journal_system-of-site_f842cc87e06ba66683bf6de2
---

## Максим хочет проверить полный демонстрационный разговор консультанта с вымышленным клиентом, которого моделирует исполнитель; синтетическое подтверждение клиента не равно утверждению Максима.
---
status: confirmed
category: decisions
scope: system-of-site
source: system-of-site user conversation 2026-09-26
evidence: Explicit user confirmation 2026-09-26; REQUIREMENTS.md pricing clarification and B01-03 ticket
event_id: journal_system-of-site_61fb366a266e7e74d215e5c6
---

## Maxim sets final commercial price for system-of-site; block calculation remains internal guidance. Repeat B01 brief with early budget and factual source-based questions. Do not auto-quote client budget or internal calculation.
---
status: confirmed
category: decisions
scope: system-of-site
source: system-of-site conversation 2026-09-26
evidence: User request following d8214c4; REQUIREMENTS.md and B01-04 ticket
event_id: journal_system-of-site_1ba28957b0d687386f782c9e
---

## System-of-site brief must ask early preferred work format: Tilda, design only, AI-assisted, custom code plus design. Also cover notable partners/clients/public figures, brandbook and logo availability. User generally approved B01-03 and requested targeted B01-04 additions.
---
status: confirmed
category: decisions
scope: system-of-site
source: system-of-site conversation 2026-09-26
evidence: Explicit user yes after B01 review; blocks/B02-APP-CRM.md
event_id: journal_system-of-site_b09539805c420cb57c38a1fc
---

## Maxim selected EspoCRM for system-of-site. B01 accepted; B02 prepared for local persistence and one CRM Lead with duplicate prevention. Live validation on laptop. No paid infrastructure authorized.
---
status: confirmed
category: decisions
scope: system-of-site
source: User chat 2026-10-01; system-of-site/docs/site-project/blocks/B04-CONSULTATION.md
evidence: Explicit user task attachment in chat 2026-10-01, current B04 consultation block and fact-pipeline task updated from that decision.
event_id: journal_system-of-site_b3c3464853e0b081b93f989d
---

## B04 uses model-led consultation: Sonnet interprets free client speech and proposes addressed versioned field changes, while the server controls allowed data, owned sources, history, explicit brief confirmation and idempotent CRM delivery. Fixed question order and per-phrase interpretation dictionaries are no longer the main path. Budget/calculation/commercial approval remain separate future stages.
---
status: confirmed
category: decisions
scope: system-of-site
source: User chat 2026-10-01 and system-of-site reports/B04-MODEL-CONSULTATION-2026-10-01.md
evidence: User-selected settings metadata checked without revealing values; Tooken returned HTTP 200, claude-sonnet-5 and end_turn on the first attempt. Full live B04 is not yet accepted.
event_id: journal_system-of-site_596acb592c205bf46a936f1d
---

## For B04, the user selects the latest Downloads settings (1).json connection: Tooken Club, claude-sonnet-5, ANTHROPIC_AUTH_TOKEN paired with its own Base URL. Read the selected file directly without overwriting the old Claude settings or copying either credential. This replaces the old default Ultracode connection for the opt-in live scenario; future paid retries still require their own applicable authorization.
---
status: observation
category: decisions
scope: system-of-site
source: system-of-site reports/B04-QUESTION-POLICY-RESULT-2026-10-02.md; independent package acceptance 2026-10-02
evidence: B04-QUESTION-POLICY app b30022e; 237 full PASS, isolated HTTP publication checks, independent Standards/Spec review and verified restored bundle9cb13509; previous7 real model replies revalidated in memory.
event_id: journal_system-of-site_bedf26b4253f2231bb9a8a7e
---

## Accepted B04 uses model interpretation and addressed v6 fact changes with free topic selection, but outgoing questions are server-owned text selected by typed topic/intent. Unrestricted model prose cannot publish a price, discount, deadline or false confirmation/delivery. Old v6 prose is accepted only as ignored compatibility input; historical confirmed snapshots remain unchanged.
