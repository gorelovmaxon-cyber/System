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
source: User conversation 2026-09-27
evidence: docs/site-project/reports/B04-LIVE-AI-RESULT.md; direct user choice 2026-09-27
event_id: journal_system-of-site_68865a763458655d53b48703
---

## Maxim selected Claude Sonnet 5 for B04 live consultation; use NunAway gateway ID claude-sonnet-5. Live validation remains pending.
---
status: confirmed
category: decisions
scope: system-of-site
source: User conversation 2026-09-27
evidence: User conversation 2026-09-27; docs/site-project/reports/B04-LIVE-AI-RESULT.md
event_id: journal_system-of-site_c3dd8511fda6911cb6879bf1
---

## Maxim authorized one B04 live AI trial with retrospective cost accounting, replacing the executor-selected 100 RUB cap for that trial.
---
status: confirmed
category: decisions
scope: system-of-site
source: User conversation 2026-09-27
evidence: User conversation 2026-09-27; docs/site-project/reports/B04-LIVE-AI-RESULT.md
event_id: journal_system-of-site_4842bcd79f0dcdbbd680282e
---

## Maxim authorized one full rental B04 briefing on claude-sonnet-5: maximum 30 generations, no retries, stop on first error, postfactum tokens and gateway units, unknown RUB; no other paid scenarios.
---
status: confirmed
category: decisions
scope: system-of-site
source: User conversation 2026-09-27
evidence: User conversation 2026-09-27; docs/site-project/reports/B04-LIVE-AI-RESULT.md
event_id: journal_system-of-site_be7fe00ae35fb6bd8020a67a
---

## Maxim authorized exactly one paid B04 technical request on app bf5e1bd with claude-sonnet-5, max_calls=1, no retries; full dialogue and other paid scenarios not authorized.
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
---
status: observation
category: decisions
scope: system-of-site
source: docs/site-project/reports/B05-RESULT.md; independent Standards and Spec 2026-10-02
evidence: docs/site-project/reports/B05-RESULT.md
event_id: journal_system-of-site_d430c2d7c856760b48f8014d
---

## B05 independently accepted on 8756ffd. Standards P2 demo cleanup fixed by explicit retention of quoted/model-audited sources; independent isolated checks passed. Spec accepts final pinned revision, 22 targeted checks combined and clean restored bundle verified. Final full suite in restored clone: 259 PASS, 176.543 seconds. Real synthetic CRM desktop/mobile proof preserved; no new paid AI or mail/Telegram. B06 local preparation continues; channels, seller details, reminder rules and production remain open.
---
status: confirmed
category: decisions
scope: system-of-site
source: system-of-site B06-RESULT and independent reviews2026-10-02
evidence: reports/B06-RESULT.md; full284 PASS235.341s; independent Standards25 PASS32.171s and Spec25 PASS35.564s; clean bundle restore25 PASS28.824s
event_id: journal_system-of-site_b4d67bbd68ee651ef8195ef8
---

## B06 local tickets accepted at app4165cbc with284 full tests and real local CRM/PDF/capture/reply/reminder proof. Full B06 awaits user settings, recipients, document branding/scope and reminder/inbound/abandoned consultation decisions; B07-B09 are unfinished.
---
status: confirmed
category: decisions
scope: system-of-site
source: User conversation2026-10-02; decision journal de21195e109e42a18853cbb8
evidence: Attachment task2026-10-02 and explicit async answers: settings later; no Sait or second PC now; publish to Git
event_id: journal_system-of-site_de21195e109e42a18853cbb8
---

## User authorizes independent B07 then available B08 and B09 preparation while B06 waits. B06 settings will be supplied later; current Sait and second-PC access unavailable, continue on PC later. Publish transferable code docs and sanitized evidence to Git, excluding secrets and private backups. Final dependent acceptance stays after B06.
---
status: confirmed
category: decisions
scope: system-of-site
source: Execution 2026-10-02; OPUS-B07-B09-HANDOFF.md
evidence: Reports B07-INDEPENDENT-RESULT.md and B08-PREPARATION-RESULT.md; application fe2f5ad4641a6ef011891baee8ffd49b1081c1b1; bundle SHA256 96e2b2f55ce2fbeb304d40c238593eb7d0610fb331d2b91c3426483ddc900fff
event_id: journal_system-of-site_7821cb9dcd1ddf58ee42fdba
---

## B07 independent work and B08-B09 preparation self-checked on app fe2f5ad; actual app/CRM isolated restore, 291 suite tests, health and real process restart PASS; awaiting Opus review and external B06/Sait/second-PC inputs.
---
status: confirmed
category: decisions
scope: system-of-site
source: Поручение пользователя в приложенном тексте, беседа 2026-10-05
evidence: system-of-site/.system2/decision-journal/5de6c4c7b6ef69b9a5a19403.json; docs/site-project/blocks/B08-VPS-DEPLOYMENT.md
event_id: journal_system-of-site_5de6c4c7b6ef69b9a5a19403
---

## 2026-10-05: пользователь приобрёл VPS и разрешил подключение, настройку, развёртывание System of Site и доступные проверки. Дополнительные покупки, платный AI и внешние сообщения автоматически запрещены. Переключение действующего домена требует отдельного решения; независимая приёмка и практический проход пользователя остаются обязательными.
---
status: confirmed
category: decisions
scope: system-of-site
source: Поручение пользователя 2026-10-05: Продолжи System of Site до готовности к эксплуатации
evidence: Поручение пользователя от 2026-10-05; docs/site-project/reports/B06-B09-OPERATIONS-PREPARATION-20261005.md
event_id: journal_system-of-site_bff6465094d38bdfae92a4a7
---

## Продолжать существующие B06–B09 до эксплуатации: сохранить принятую fe2f5ad и перенос второго ПК, сначала закончить независимую подготовку и собрать недостающие решения одним списком; затем VPS, единый разрешённый живой сценарий, Opus 5.5 и практическое обучение. Платный AI и внешние отправки требуют явного разрешения.
---
status: confirmed
category: decisions
scope: system-of-site
source: User attachment 2026-10-05: full System of Site PC handoff, scope and continuation sequence
evidence: User full PC handoff attachment 2026-10-05; PC-HANDOFF-20261005.md records scope and next actions
event_id: journal_system-of-site_84503fdfb428949882e08491
---

## 2026-10-05 PC handoff only: preserve and publish related code/docs/evidence, add no features, deploy nothing and make no paid runs. Next diagnose questionnaire dialogue through actual configuration/transport/contract/UI; target free client input with relevant questions while facts, prices and documents remain server-controlled. VPS diagnosis proceeds independently; proposals remain unapproved until owner decision.
---
status: confirmed
category: decisions
scope: system-of-site
source: User attachment 2026-10-05: unified request and AI brief product change
evidence: User-approved product change; docs/site-project/blocks/B08-UNIFIED-BRIEF.md, B08-06 to B08-09
event_id: journal_system-of-site_3e47dfcee661e1078a1490b5
---

## User approves unified intake and existing B04 AI brief in cards or conversation: one saved profile/history/request, specialist-only attachments excluded from model, server progress and explicit version confirmation, operator price/documents preserved. Implement scoped B08 tickets and controlled checks; live AI requires current settings and spending permission, VPS later.
---
status: confirmed
category: decisions
scope: system-of-site
source: User attachment 2026-10-05 correction of unified brief implementation; screenshot and follow-up
evidence: User attachment 2026-10-05 correction of unified brief implementation; screenshot and follow-up
event_id: journal_system-of-site_335e279719c94064ca77a0ab
---

## User rejects unified brief AI conversation and chat UI at cc38631/c651166. Correct existing B08 tickets: separate natural conversational reply from grounded structured edits, answer client questions and help choose using approved knowledge, retain specialist-only attachments and integrations, build true chat/cards with compact progress and explicit review. Controlled preview is not proof of real AI understanding; live validation and independent acceptance remain separate.
---
status: confirmed
category: decisions
scope: system-of-site
source: User reply 2026-10-05: Downloads, latest downloaded settings, spend as needed
evidence: User reply 2026-10-05: Downloads, latest downloaded settings, spend as needed
event_id: journal_system-of-site_7f4f0f81ac05c336fb8fea95
---

## User authorizes necessary paid corrected B08 conversation using latest downloaded settings and selected claude-sonnet-5; account actual calls and usage postfactum when provider price is unknown. Selected provider metadata: Tooken; secrets remain private.
---
status: confirmed
category: decisions
scope: system-of-site
source: User messages 2026-10-06: do not count first three form items; start with first question; connect real model so I can try it; then do it
evidence: User messages 2026-10-06: do not count first three form items; start with first question; connect real model so I can try it; then do it
event_id: journal_system-of-site_d36a698c507948f4e2e86e47
---

## User requires initial form fields remembered only as AI context, excluded from brief progress: after choosing cards or AI start with first brief question at zero completed, minimum 25 meaningful brief items. User authorizes connecting the existing private model settings for hands-on real-model testing instead of the scripted preview.
---
status: confirmed
category: decisions
scope: system-of-site
source: User 2026-10-06: approves batch plan, requires semantically coherent groups based on initial site choice and spinner with analysis text.
evidence: Direct user approval 2026-10-06 in active session; docs/site-project/transfer/ASTRA-B08-BATCH-BRIEF-20261006.md
event_id: journal_system-of-site_9b434ba8cfd8501e20109cb7
---

## User approves Astra batch brief implementation: first prepared questions, then AI analysis and meaningful consecutive groups tailored to initial site/service selection; real chat retained, spinner and honest analysis text before model work.
---
status: confirmed
category: decisions
scope: system-of-site
source: User conversation 2026-10-06; system-of-site/docs/site-project/transfer/OPUS55-CHAT-LATENCY-AND-SYSTEM-20261006.md
evidence: User explicitly clarified that this role split is what they proposed; detailed current implementation, timings and unresolved decisions recorded in OPUS55-CHAT-LATENCY-AND-SYSTEM-20261006.md.
event_id: journal_system-of-site_6d2ee5bb6eb688da249ff55f
---

## User confirmed role split for System of Site latency: fast model conducts adaptive AI chat in our existing design; Sonnet receives conversation data to assemble final brief and remains responsible for card questions. A detailed manual handoff to Opus 5.5 is requested. Specific fast model/provider and publication/synchronization contract remain open; no new implementation or mass tests in handoff preparation.
---
status: confirmed
category: decisions
scope: system-of-site
source: User task 2026-10-06; docs/site-project/reports/B10-USER-FLOW-RESULT-20261006.md
evidence: Attached user request 2026-10-06; B10-USER-FLOW-RESULT-20261006 and OPUS-B10-USER-FLOW-20261006 describe implementation and verification limits.
event_id: journal_system-of-site_ded1597b5784ff6b183ec576
---

## Complete B10 only in its isolated stand, preserving production; streamed chat and separate verified assembly share the existing brief with cards and explicit version confirmation. No mass paid runs or new comparisons; live validation needs current spend approval.
---
status: confirmed
category: decisions
scope: systemqwen
source: Беседа 2026-10-08: исходное состояние поручения «Заверши оставшуюся проверку ROLES-04 в System2» и последующее уточнение «Не запрашивай искусственную поправку для ROLES-04»; .scratch/decision-journal/RESULT.md#roles-05-external-verdict.
evidence: .scratch/decision-journal/RESULT.md#roles-05-external-verdict; прямой внешний вердикт и уточнение передачи пользователем 2026-10-08.
event_id: journal_systemqwen_bac8c4e15db5b963499fa9f6
---

## ROLES-05 принят внешним проверяющим по вердикту, переданному пользователем: замены механизмов сейчас не требуются. По последнему уточнению пользователя ROLES-04 остаётся awaiting-validation до следующего реального уточнения в обычной работе; специальную поправку ради проверки не запрашивать и новые тестовые задачи не создавать. Незавершённая проверка памяти не блокирует обычную работу System2 и не означает гарантированного автосохранения.
---
status: confirmed
category: decisions
scope: system-of-site
source: User conversation 2026-10-09, explicit live-preview connection instructions
evidence: Explicit user instructions in conversation 2026-10-09; only local runtime preparation and CRM connectivity smoke performed, zero paid AI calls.
event_id: journal_system-of-site_7a11962baf8e3aa199a457cd
---

## For local manual preview of unified app fd6f80b, user selects Tooken with requested claude-sonnet-5-5 for chat/cards and OneProvider with requested claude-sonnet-5-5 for assembly. Resolve legacy settings override explicitly, keep private credentials outside Git, preserve requested/returned model validation and records. Pricing stays server-side with operator commercial approval and PDF from agreed data. Real local EspoCRM is authorized; mail, Telegram, reminders, mass paid scenarios and automatic paid retries are not. This does not authorize a new implementation or production deployment.
---
status: confirmed
category: decisions
scope: system-of-site
source: Беседа 2026-10-09, пересказ клиентского пути
evidence: Прямое задание пользователя, разделы 2–13 приложенного текста; CP-01..CP-05 в docs/site-project/tickets/CLIENT-PATH-20261009.md
event_id: journal_system-of-site_6152e001e460ca2109dd3f21
---

## Клиентский путь: единый сохраняющийся попап, короткая форма и один общий план для Тестового опроса и AI-разговора; источники проходят проверяемую сборку, подтверждение точной версии и серверный расчёт. Сохранить Tooken/OneProvider и EspoCRM; рассылки отключены, автоматический живой прогон требует отдельного ограниченного бюджета.
---
status: confirmed
category: decisions
scope: system-of-site
source: User publication task, 2026-10-09; docs/site-project/blocks/ADAPTIVE-PATH-20261009.md; full prior planner text unavailable
evidence: User publication task of 2026-10-09 and docs/site-project/blocks/ADAPTIVE-PATH-20261009.md; full prior planner text not found, all three tasks planned, no implementation claimed
event_id: journal_system-of-site_2d37f3369d9623991e208c5b
---

## Publish current System of Site app bundle, site and docs without new features. Preserve the next adaptive block: shared topics and state first, then AI behavior and UI in parallel worktrees, UI owner integrates, one independent acceptance. Survey analyzes groups up to five; chat understands each message without a second sequential call; four stages; no speculative next-group generation.
---
status: confirmed
category: decisions
scope: site-portfolio
source: Беседа MAXMADE 2026-10-14, ответы пользователя и проверка экспортированного профиля
evidence: Ответ пользователя в беседе 2026-10-14 о списке доменов/выборе имени; локальные выводы пути Downloads и XML encryption mode basic; HANDOFF отдельной ветки аудита
event_id: maxmade_domain_choice_20261014
---

## Пользователь выбрал maxmade-studio.ru для покупки и подтвердил отсутствие доменов в своём кабинете AdminVPS. Покупка/DNS ещё не подтверждены. Экспорт Proxifier Default.ppx найден в перенаправленных Загрузках E:/Downloads и перемещён в защищённую пользовательскую .ssh папку с ACL только текущего пользователя. Он всё ещё имеет Encryption mode basic; запрошен повторный экспорт Disabled, пароль не выводился, прокси на VPS ещё не применялся.
---
status: confirmed
category: decisions
scope: systemqwen
source: Беседа 2026-10-18; .scratch/start-routing-2026-10-18/TASK.md
evidence: .scratch/start-routing-2026-10-18/TASK.md; прямое решение пользователя
event_id: journal_systemqwen_431339da088fd46aff273e39
---

## 2026-10-18: start должен завершаться рекомендацией команды без автоматического перехода к фазам; site-build следует autopilot с правилами сайта; планировщик готовит передачу отдельному исполнителю, включая задачи визуальных макетов. Подготовлен START-ROUTING-01, действующие навыки пока не изменены.
---
status: confirmed
category: decisions
scope: system-of-site
source: User full AI leading brief task and explicit seven-call approval, 2026-10-13; docs/site-project/transfer/AI-LEADING-BRIEF-TASK-20261013.md
evidence: Full task docs/site-project/transfer/AI-LEADING-BRIEF-TASK-20261013.md and explicit user approval up to7 calls; app base121eb1c, separate AI branch; do not infer another budget from session restart
event_id: journal_system-of-site_9cda865729d295518cca7195
---

## AI-01 supersedes the broad AP plan on this PC: improve only the leading AI brief conversation in a separate branch from121eb1c; survey is developed independently on another PC. Keep form/consent/rates/PDF/CRM/provider/model unchanged; no competing shared migrations. User explicitly allowed at most7 automatic live calls total, no automatic retries; local fixtures remain independent.
---
status: confirmed
category: decisions
scope: system-of-site
source: User conversation 2026-10-13
evidence: User conversation 2026-10-13: explicit format separation requirement and requested chat autoscroll fix.
event_id: journal_system-of-site_97a950da4ac3c92fd9c5acf8
---

## Choose survey or AI chat once per enquiry. Switching to the other format is forbidden after selection, including back, reload and a contrary view URL. Preserve previous answers and the existing calculation, PDF and CRM pipeline.
---
status: confirmed
category: decisions
scope: system-of-site
source: User conversation 2026-10-13
evidence: User task AI-SUFFICIENCY-TASK-20261013.md, conversation 2026-10-13
event_id: journal_system-of-site_2baea97336a0100dee1f49bb
---

## Only AI chat changes: finish on sufficient business, goal, visitor scenario, substantial capabilities, materials/help and applicable conditions. Server calculates stage progress from verified preliminary marks without another AI call; omit question counts and numerical percentages. Unknown budget/deadline remain open. Align assembly and confirmation for chat only; leave survey intact.
---
status: confirmed
category: decisions
scope: system-of-site
source: User conversation 2026-10-13
evidence: User independent review, conversation 2026-10-13; 25 tests in14.745s
event_id: journal_system-of-site_4cb37b88f63de034686f1aed
---

## Independent user review of d88a464 passed 25 tests but found natural unknown replies and redesign under features bypassed intended handling. Keep AI-02 awaiting review; fix durable topic-specific help and rework applicability across agreed fields. Live quality and prior no-text failures remain unverified by scripted tests.
---
status: confirmed
category: decisions
scope: system-of-site
source: User conversation 2026-10-13
evidence: User conversation 2026-10-13: do as many as necessary, reply to budget continuation question
event_id: journal_system-of-site_3a14fe21032fdbed59015186
---

## User authorizes as many paid calls as necessary to complete this one AI-03 synthetic live conversation and final brief. Previous seven-call ceiling no longer blocks this scoped continuation. Keep cumulative accounting, no mass scenarios or implicit paid replay, no CRM/messaging sends.
---
status: confirmed
category: decisions
scope: system-of-site
source: User conversation 2026-10-13: explicit MAXMADE repository, tag, commit and canonical launch instructions
evidence: Explicit user selection 2026-10-13; GitHub tag resolves to specified commit; version-specific HANDOFF and docs/MAXMADE-TRANSFER.md read. npm ci, verify284 files and build passed, canonical localhost5179 HTTP200 after per-process IPv4 DNS preference.
event_id: journal_system-of-site_d8752e2bf00f441cd4218f54
---

## User selected the intended MAXMADE website from Sait fixed tag maxmade-v5-2026-10-13, commit bf8c412fa6193d59c302b01d00f0eaa74d1b7679. Obtain it in a new folder, preserve old copies and local edits, verify the release and run dev:canonical at localhost5179. Previous Sait9c35970 and5176 must not be treated as the selected website. This instruction does not authorize rewriting the pinned UI or assuming PHP/CRM works under Vite.
---
status: confirmed
category: decisions
scope: system-of-site
source: User AI-04 task, conversation 2026-10-13, paraphrased scope
evidence: User AI-04 task, conversation 2026-10-13, explicit scope; supplied task preserved in project transfer.
event_id: journal_system-of-site_aee93597561c18c40764d8a3
---

## AI-04 uses MAXMADE bf8c412 as the visual reference and embeds the existing intake and AI brief in its modal. Preserve the survey, backend contracts, private settings and old worktrees. Use controlled responses with no paid calls or real sends for this styling task.
---
status: confirmed
category: decisions
scope: system-of-site
source: User conversation 2026-10-13: explicit AI-04 scope correction, paraphrased
evidence: Direct user scope correction 2026-10-13; supersedes journal aee93597561c18c40764d8a3. Separate site and AI are explicitly required.
event_id: journal_system-of-site_f671dc0e4dad884bdef39e1b
---

## AI-04 scope corrected by user: restore MAXMADE native LeadForm, header/menu, cursor, modal and launch configuration to bf8c412. Preserve new styling only on the separate selected AI chat/brief window; shared intake and format choice return to app168d50b. Do not embed AI or add/reassign site buttons. Preserve all logic, private settings, conversations and databases.
---
status: confirmed
category: decisions
scope: systemqwen
source: Беседа 2026-10-20, поручение «Доработай /start» с наблюдавшимся расплывчатым ответом; .scratch/start-routing-2026-10-18/issues/START-ROUTING-02.md; .scratch/start-routing-2026-10-18/RESULT.md#start-routing-02.
evidence: Прямое уточнение пользователя 2026-10-20, критерии завершения и сценарии А–Е; живая проверка awaiting-validation, push запрещён.
event_id: journal_systemqwen_26f61512a56c539e5e04b97c
---

## START-ROUTING-02, решение пользователя 2026-10-20: start завершён только после выбора одного основного маршрута с точной доступной командой и задачей либо готовым текстовым поручением. Без подтверждённого slash-интерфейса нужен текст с путём к каноническому навыку. При существенном неизвестном — один короткий вопрос и состояние «маршрут ещё не выбран»; ответ продолжает текущую маршрутизацию. Слово «система» не определяет масштаб; малая определённая правка идёт прямым поручением с проверкой. Неизвестная роль не блокирует понятную рекомендацию и не назначает агента исполнителем. Grill/spec/тикеты/реализация внутри start запрещены; выбранный затем autopilot ведёт разрешённые фазы до передачи планировщика без повторного start. Живая проверка пока не проведена, PDF-памятка от 08.10.2026 устарела в описании start.
---
status: confirmed
category: decisions
scope: system-of-site
source: Беседа 2026-10-15, прямое поручение завершить самостоятельно до утра
evidence: Прямое поручение завершить самостоятельно до утра; отдельный журнал вызовов, синтетические данные и отсутствие реальных отправок обязательны.
event_id: journal_system-of-site_9255bc76605f61fa995a164a
---

## Пользователь разрешил необходимые платные AI-вызовы для завершения текущей доводки короткого брифа без дополнительных вопросов; реальные отправки, commit и публикация не разрешены.
---
status: confirmed
category: decisions
scope: system-of-site
source: Беседа 2026-10-16, задание об исправлении преждевременного завершения AI-брифа; journal36ce3e3bec4831428f2da086
evidence: Прямое задание пользователя; подтверждено содержимым приложения к беседе, без вывода технических предпочтений за его пределы.
event_id: journal_system-of-site_36ce3e3bec4831428f2da086
---

## Короткий AI-бриф должен рассмотреть основные направления бизнеса, доверия, цифр, покупателей, материалов, оформления и условий. Сокращаются лишние реплики, а не направления; ответы, отсутствие, неизвестность, отказ и не обсуждавшееся различаются. После готовности консультант продолжает отвечать, принимает поправки и не заменяет ответ приглашением к сборке. Сайт, формы, опрос, оформление, расчёты и рабочие подключения не менять; коммиты и публикация запрещены.
---
status: confirmed
category: decisions
scope: system-of-site
source: Беседа 2026-10-18; .system2/decision-journal/bdfc539b0f2511b4be28b227.json
evidence: Прямые семь требований пользователя по результатам ручного AI-брифа; журнал bdfc539b0f2511b4be28b227.
event_id: journal_system-of-site_bdfc539b0f2511b4be28b227
---

## AI-разговор System of Site: дизайн решает Максим; спрашивать только наличие референсов, без помощи и повторов при их отсутствии. Структуру и страницы не спрашивать и не предлагать; выяснять функции. После бизнеса идут брендбук/логотип, отдельно ТЗ с возможностью вложений, затем тип сайта. Вопросы о бюджете запрещены. После первого ответа доступно досрочное завершение неполного брифа с открытыми пробелами, просмотром и подтверждением. Сайт и тестовый опрос не меняются; коммиты и публикация запрещены.
---
status: confirmed
category: decisions
scope: system-of-site
source: Беседа 2026-10-19; docs/AI-CHAT-DESIGN-SCOPE.md приложения
evidence: Прямое поручение пользователя 2026-10-19 и ответ: новый отдельный репозиторий GitHub; journal b42bf82c6a0626c82effd6fc.
event_id: journal_system-of-site_b42bf82c6a0626c82effd6fc
---

## Для System of Site после успешного ручного прохождения AI-брифа дальнейшие изменения ограничены дизайном окна AI-чата; логику, сайт MAXMADE, формы, тестовый опрос, ставки, PDF и CRM сохранять. AI-приложение публикуется отдельным снимком в новом репозитории GitHub с собственной историей; существующие репозитории не менять.
---
status: confirmed
category: decisions
scope: system-of-site
source: Беседа 2026-10-19; журнал 0b4adc9f2632b88852a08031, system-of-site
evidence: Прямое уточнение владельца с PDF-образцом в беседе 2026-10-19; локальная реализация и адресные проверки описаны в docs/CRM-TABLE-20261019.md.
event_id: journal_system-of-site_0b4adc9f2632b88852a08031
---

## Для system-of-site владелец выбрал простую CRM-таблицу MAXMADE вместо интерфейса EspoCRM: 12 столбцов, фильтр услуги заменяет фильтр кнопки и наоборот, дата комбинируется. Отметка брифа требует явного подтверждения клиента; отметки ТЗ, лого и брендбука требуют настоящих вложений.
---
status: confirmed
category: decisions
scope: system-of-site
source: Owner clarification2026-10-19; docs/CRM-SHARED-20261019.md; shared CRM live-browser proof and23 addressable tests
evidence: Owner correction;23 addressed tests; browser CRM1440/768/390 and actual live login confirmed shared applications and file access. User tables preserved across migration; earlier12-column standalone CRM is historical.
event_id: journal_system-of-site_e7e453dda8d22429d667ab6f
---

## Owner simplified CRM: service column and filter must use only initial-form services, not landing/shop page types; remove type-unspecified wording and the button column. Missing live applications were caused by CRM18192 reading an earlier database copy while form/chat18186 stored current submissions. Existing CRM table integrated into live combined app using the same Store and files; real operator browser verified9 enquiries including2 submitted forms and1 existing attachment. Prior login retained, no new live test applications, external deliveries, paid AI calls or publication.
---
status: observation
category: decisions
scope: system-of-site
source: Самопроверка исполнителя 2026-10-20, HANDOFF и FULL-LOCAL-INTEGRATION-20261020.md; не независимая приёмка
evidence: 963 tests in 498.290s OK; desktop/mobile connected browser PASS; restored package hashes/routes PASS
event_id: journal_system-of-site_60cdb36fe52f47f69cf41c3c
---

## Полная локальная связка MAXMADE с общей формой, неизменяемыми режимами опроса и AI, табличной CRM и операторским расчётом проверена. Подтверждённый опрос теперь допускается к расчёту без подмены ответов AI-фактами; источник и коммерческое одобрение проверяются. 963 теста, lint/types и сквозные браузерные сценарии обоих режимов на компьютере и телефоне прошли. Данные и исходный сайт сохранены. Полноценного AI-анализа максимального состава блоков пока нет; ставки прежние, внешние отправки отключены, новых платных вызовов и публикаций нет.
---
status: observation
category: decisions
scope: system-of-site
source: Самопроверка исполнителя 2026-10-20, HANDOFF и FULL-LOCAL-INTEGRATION-20261020.md; не независимая приёмка
evidence: {'tests': 963, 'seconds': 474.949, 'lint': 'OK', 'types': 'OK'}; desktop/mobile connected browser PASS; restored package hashes/routes PASS
event_id: journal_system-of-site_e58410a5c97d23f1c83bbcf6
---

## Полная локальная связка MAXMADE с общей формой, неизменяемыми режимами опроса и AI, табличной CRM и операторским расчётом проверена. Подтверждённый опрос теперь допускается к расчёту без подмены ответов AI-фактами; источник и коммерческое одобрение проверяются. 963 теста, lint/types и сквозные браузерные сценарии обоих режимов на компьютере и телефоне прошли. Данные и исходный сайт сохранены. Полноценного AI-анализа максимального состава блоков пока нет; ставки прежние, внешние отправки отключены, новых платных вызовов и публикаций нет. Финальная версия включает исправление адреса иконки сайта после обнаруженного 404 и повторный общий набор.
---
status: observation
category: decisions
scope: system-of-site
source: Перепроверка по запросу пользователя 2026-10-20, квитанция recheck-full-local-20261020/RESULT.json
evidence: 73 tests in 36.431s OK; hash checks/routes/browser/npm audits recorded
event_id: journal_system-of-site_987e706a33c2bec0db79b04c
---

## Повторная проверка неизменённой полной локальной версии d96ac759: 73 адресных теста и браузер компьютера/телефона прошли; код, сборки и пакет совпали по хешам; SQLite цела, CRM закрыта без входа, процесс слушает только loopback, приватный AI-ключ в пакете отсутствует. Production npm audit: 0 для сайта и интерфейса брифа; в инструментах сборки сайта остаются 14 замечаний. Автоматический состав блоков по правилам и демонстрационный PDF остаются ограничениями. Код, GitHub и VPS не изменялись; платных вызовов нет; это самопроверка, не независимая приёмка.
---
status: observation
category: decisions
scope: system-of-site
source: Уточнение пользователя и завершение проверки кнопки 2026-10-20; HANDOFF и opening-button-20261020/VERIFIED.json
evidence: {"tests": 963, "seconds": 619.926, "lint_types": "OK"}; browser1440/390 PASS; code diff exactly2 files
event_id: journal_system-of-site_e4176fcc6a0779e71b10c699
---

## Пользователь уточнил, что отказ начала AI-разговора вызван пропавшим интернетом, и попросил изменить только кнопку повтора. Исправлены только атрибут CSS-класса и стиль: ширина по тексту, выравнивание слева, боковые отступы 18px вместо растяжения flex. Подключение, модель, логика повтора и данные не менялись. Браузер 1440/390 подтвердил компактную кнопку и сохранение ввода при явном повторе; прежние AI/опрос/режимы прошли. 963 теста, линтер и TypeScript прошли. Платных вызовов и публикаций нет; самопроверка исполнителя.
---
status: observation
category: decisions
scope: system-of-site
source: Запрос пользователя и самопроверка 2026-10-20; HANDOFF приложения и brief-review-20261020/VERIFIED.json
evidence: {"tests": 963, "seconds": 530.158, "lint_types": "OK"}; shared card styles and submit failure gates desktop/mobile PASS
event_id: journal_system-of-site_d77b0e57b5b41dc021e8e17e
---

## По просьбе пользователя изменён только итоговый клиентский экран брифа: AI и тестовый опрос используют общие нумерованные карточки вопрос/ответ с карандашом. В обоих режимах после явной отправки и успешного ответа сервера показывается благодарность; зелёный служебный блок и надпись о сохранённом черновике убраны. AI использует прежние подтверждение текущей версии и отправку; при ошибке подтверждения или сохранения благодарности нет. Начальная форма, разговор, серверные защиты, расчёт, CRM, данные и доступы не менялись. 963 теста, lint/types и управляемые браузерные сценарии1440/390 прошли, включая исправление ответа, восстановление, повтор без дубля, блокировку устаревшей версии, CRM и PDF. Платных вызовов, внешних отправок и публикаций нет. Самопроверка исполнителя.
---
status: observation
category: decisions
scope: system-of-site
source: Запрос пользователя и самопроверка 2026-10-20; intake-autosave-20261020/VERIFIED.json, RESTORED.json; ai-brief-example-20261020-corrected/AUDIT.json
evidence: {"tests": 963, "seconds": 548.915, "lint_types": "OK"}; desktop/mobile autosave regression PASS; live first assembly exact sources PASS
event_id: journal_system-of-site_c91d870b35c08f7cd8645e2d
---

## Устранён цикл автосохранения начальной формы в общей локальной системе брифа и AI. Причина — зависимое от порядка ключей JSON.stringify-сравнение с серверным каноническим JSON. Только IntakeApp.tsx: стабильное сравнение значений в autosave/dirty/beforeunload. RED: четыре лишних запроса за2.5с. GREEN1440/390: нет повторов, reload, реальная правка, отзыв согласия. 963 tests in548.915s OK; lint/types, AI/опрос/неизменяемость режима browser PASS. Настоящий пример OneProvider: семь естественных ответов, девять вызовов с началом и сборкой, 26 полей первой сборки, цитаты сверены с клиентскими сообщениями, редактор не применялся. Открыт в отдельном профиле Edge; создан снимок HTML. Документ не подтверждён и не отправлен. Первый ошибочный сценарий проверки сохранён: отвечал по служебной теме вместо видимого вопроса; восемь попыток, последняя остановлена локально. Итого17 платных попыток, ошибок провайдера0. Backend/CRM/расчёт/исходные системы/ключи не менялись. Только локально, внешних отправок и публикаций0. Полный пакет847 файлов восстановлен отдельно; хеши и HTTP-маршруты совпали. Самопроверка исполнителя.
---
status: observation
category: decisions
scope: system-of-site
source: Поручение пользователя20.10.2026; GitHub https://github.com/gorelovmaxon-cyber/gotovaya-sistema-brifa/commit/e9c4868b0f55d5e4abb4be167e67cc76007942a2; PUBLICATION-MANIFEST и FRESH-CLONE.json
evidence: {"tests": 963, "seconds": 818.692, "lint_types": "OK", "result": "ALL CHECKS PASSED"}; fresh GitHub clone hash/routes PASS
event_id: journal_system-of-site_3f8a4c21718b877d449f1368
---

## По прямому поручению пользователя в отдельную папку «готовая система» существующего приватного GitHub-репозитория gotovaya-sistema-brifa опубликован полный локальный цикл: кнопки MAXMADE, общая форма, опрос/AI, общий итог с правками и подтверждением, спасибо, CRM, внутренний расчёт, цена/одобрение Максима и демо PDF. Старые348 файлов сохранены. Новая папка имеет переносимые live/browser launcher и отдельный workflow. Commit e9c4868b0f55d5e4abb4be167e67cc76007942a2; 963 tests in818.692s OK, lint/types и сквозной browser обоих режимов1440/390 до PDF PASS. Обе сборки совпали с исходником. Свежий GitHub clone: все файлы/хеши и HTTP-маршруты/права проверены. Другие репозитории и VPS не менялись, ключи/клиентские БД не публиковались; новых платных вызовов/рассылок0. Остаток: VPS, свежие исходники сайта5d58c4f (архив в полученной передаче отсутствует), перенос CTA-подсказок в форму, полноценное AI-планирование блоков, демо PDF и независимая приёмка.
---
status: confirmed
category: decisions
scope: systemqwen
source: Беседа 31.10–01.11.2026; прямое поручение пользователя перенести согласованный навык в System2 как ОбращениеСайты; journal 5f01efbd51050881b65db926.
evidence: .claude/skills/obrashchenie-saity/SKILL.md; .claude/skills/obrashchenie-saity/references/examples.md; CLAUDE.md: Обращения по сайтам; docs/task-map.md
event_id: journal_systemqwen_5f01efbd51050881b65db926
---

## В System2 создан отдельный канонический навык ОбращениеСайты (obrashchenie-saity): персональные предложения Максима по сайтам и UX/UI строятся от задачи адресата с одним конкретным похожим кейсом, без цен в откликах и без рассказов о внутренних ИИ-системах; бесплатный главный экран до предоплаты выделяется, формат разработки и финальный вопрос выбираются по задаче и каналу.
---
status: confirmed
category: decisions
scope: systemqwen
source: ?????? 2026-11-01: ????? ????????? ????????? System2 ? GitHub ???????????? ??????? ??????????????; .scratch/system-sync-20261101/TASK.md
evidence: ?????? ????????? ????????????; SYSTEM-SYNC-01, .scratch/system-sync-20261101/RESULT.md; ???????? HEAD ? live master a18fa6e, ?????? modified ? ???? untracked ??????.
event_id: journal_systemqwen_b725dc442c77d9b4e0d10262
---

## ?? ????????? ???????????? 2026-11-01 ????????? ???????????? GitHub System ?? ?????????? ?????? ?????? ? ??????????. ???????????? ??????????? ? ???????? ??????????? ? ?????????; ?????????? ?? ???????? Autopilot/Astra ? ?? ????????? ????????????? CORE-FIX/PROFILE.
---
status: confirmed
category: decisions
scope: systemqwen
source: Беседа 2026-11-01: после сравнения локальной System2 и GitHub пользователь поручил «актуализируй»; .scratch/system-sync-20261101/TASK.md
evidence: Прямое поручение пользователя; SYSTEM-SYNC-01. Проверка обнаружила отсутствие кириллицы и 177 знаков вопроса в новой записи b725dc442c77d9b4e0d10262. Поправка прочитана из UTF-8 JSON, исходные 18 событий памяти сохранены без изменений.
event_id: journal_systemqwen_95b6df83b52af26269504862
---

## По поручению пользователя 2026-11-01 разрешена актуализация GitHub System по локальному пакету памяти и документов. Исторические предложения и передачи сохраняются с пометками; публикация не внедряет Autopilot/Astra и не принимает незавершённые CORE-FIX/PROFILE. Эта поправка заменяет новую запись b725dc442c77d9b4e0d10262, повреждённую кодировкой PowerShell при передаче текста в Python; новых предпочтений не добавляет.
---
status: confirmed
category: decisions
scope: geo-tracker
source: беседа 2026-11-08, пересказ
evidence: указание владельца в аргументах /start
event_id: journal_geo-tracker_a840718085774174ae7282aa
---

## GEO: все тикеты выполняет один исполнитель сам; субагенты только если ускоряют; скорость и качество важнее экономии лимитов
---
status: confirmed
category: decisions
scope: geo-tracker
source: беседа 2026-11-08, пересказ
evidence: прямое указание владельца
event_id: journal_geo-tracker_89311b66da255dec6eaa8682
---

## GEO: работа ведётся в E:/GEO-рассылка; HANDOFF проекта system-of-site для GEO не использовать
---
status: confirmed
category: decisions
scope: geo-tracker
source: беседа 2026-11-08, пересказ
evidence: прямое указание владельца
event_id: journal_geo-tracker_61bc28f7934f2731347ae631
---

## GEO: собрать продукт целиком, без ошибок, перепроверяя каждый тикет; предпочитать готовые сервисы
---
status: confirmed
category: decisions
scope: geo-tracker
source: ЗАДАНИЕ-ПОЛНЫЙ-ПРОДУКТ.md
evidence: таблица решений ЗАДАНИЕ-ПОЛНЫЙ-ПРОДУКТ.md, решение владельца 08.11.2026
event_id: journal_geo-tracker_074ed4c50742315f8c1b9b83
---

## GEO: месячный лимит расходов на API не задан — расходы фиксируются, но не блокируют прогон
---
status: confirmed
category: decisions
scope: geo-tracker
source: research/b0/RESULT.md
evidence: research/b0/RESULT.md, коммит 191c9b2
event_id: journal_geo-tracker_3ba15bc06d290aa0c9dbe753
---

## GEO: выход — аудит одной командой первым, SaaS вторым; отличие — честность замера (режим поиска, устойчивость, журнал вмешательств, готовность к AI)
---
status: confirmed
category: decisions
scope: geo-tracker
source: коммит afdc4d6
evidence: коммит afdc4d6, 269 тестов SQLite и Postgres 16 OK 2026-11-09
event_id: journal_geo-tracker_44aa3c1faff69aeaf8e637e4
---

## GEO: Postgres через адаптер geo/pg.py поверх чистого SQL, не ORM; SQLite для запуска из чистого клона; совместимость доказана прогоном всего набора на обеих базах
---
status: confirmed
category: decisions
scope: geo-tracker
source: приёмка §8, 2026-11-09
evidence: research/final/REPORT-S8.md, коммит f8ce960; python -m unittest discover -s tests → 295 OK; scripts/test_postgres.py → 295 OK
event_id: evt_26708b90e0ed
---

## GEO-трекер: отчёт §8 закрыт — приёмка по блокам (B0/B2/B3 PASS; B1/B4/B5/B6 PARTIAL), 295 тестов на SQLite и Postgres, оценка стоимости ~$94/мес при 10 вопросах × 3 повтора × 31 день; продукт целиком §6 не принят без двух недель истории, боевой оплаты и домена
---
status: confirmed
category: decisions
scope: systemqwen
source: беседа 2026-11-09, System2/System of Site
evidence: Прямое сообщение пользователя в сессии 2026-11-09: «теперь всегда 1 исполнитель это opus 5.5… скорее всего это автопилот, вся такая система из грилл все дела»
event_id: journal_systemqwen_opus-executor-policy-20261109
---

## Пользователь выбирает исполнителем Opus 5.5 постоянно; экономия токенов больше не ограничение при выборе маршрута. Предпочтителен autopilot-цикл (grill → spec → тикеты → исполнитель).
---
status: confirmed
category: decisions
scope: systemqwen
source: беседа 2026-11-09, пересланные материалы
evidence: Сообщение пользователя 2026-11-09 с подборкой 9 модов и карточкой Hindsight; прямая формулировка «мб как альтернатива khoj»
event_id: journal_systemqwen_tooling-candidates-20261109
---

## Слой исполнения: Hindsight как кандидат на замену Khoj для памяти; 9 модов Claude Code приняты как направление, ставить только официальные (blast-radius, you-should-know, replay-theater) и Reflect.
---
status: confirmed
category: decisions
scope: systemqwen
source: Сессия 2026-11-10, System2 HANDOFF раздел 2026-11-10
evidence: Пользователь 2026-11-10: «да, все 3 пункта выполняй и коммитим систему в гитхаб» (обновить HANDOFF, подключить /ap2 в start, опубликовать); docs/ap2-integration.md; smoke ap.py init/stage/finish rc=0
event_id: journal_systemqwen_ap2-start-route-20261110
---

## Autopilot 2 внедряется не заменой System2, а отдельным движком /ap2 (nick-vels/skills@v2.1.0): роли, журнал решений и HANDOFF остаются снаружи; /ap2 добавлен в таблицу рекомендаций start для одного проекта под ключ с дашбордом и слепой приёмкой, сайты остаются на /maxmade-autopilot. Первый реальный прогон /ap2 считается пробным.
---
status: confirmed
category: decisions
scope: system-of-site
source: Беседа 2026-09-29 (задание OPUS-B04-FOCUSED); ответ 2026-09-30; сверка 2026-11-10
evidence: docs/site-project/reports/B04-FINAL-SEMANTICS-RESULT.md раздел 2026-09-30; commits cfff531, 49b163c, d811f5e; WORK-PLAN origin/b04-live-ai: B04/B05 done
event_id: journal_system-of-site_05e6a53ce5f1b2c650f1cc1f
---

## Максим запросил точечную передачу Opus по истории ошибок и последнему сбою B04 с заданиями S1 (ясный формат принимается без зависимости от формы фразы) и S2 (реальная цитата не означает достаточность ответа). Задание выполнено: S1 исправлен на ноутбуке (app b1a88f5, 8 целевых / 167 полный Python PASS, 0 платных вызовов), позже B04 принят независимо и закрыт в WORK-PLAN.
---
status: observation
category: decisions
scope: geo-tracker
source: User typography correction and local browser verification
evidence: geo/web_assets/landing.html; HANDOFF.md; research/design/SECONDARY-HEADINGS-LIGHTER-2026-11-11.png
event_id: journal_geo-tracker_d6ec7dc844fb68fea69dff98
---

## GEO, уточнение владельца 11.11.2026: уменьшена жирность второстепенных заголовков лендинга h2/h3 с 600 до 400. Шрифт остаётся Arial, главный h1 сохраняет 600. Основной текст Nunito, единые размеры надзаголовочных плашек сохранены. Edge 1366/390/320 px: веса 600/400 подтверждены, переполнения нет; 9 тестов лендинга OK.
---
status: observation
category: decisions
scope: geo-tracker
source: User heading hierarchy clarification and browser checks
evidence: geo/web_assets/landing.html; HANDOFF.md; research/design/SECTION-AND-CARD-HEADINGS-2026-11-11.png
event_id: journal_geo-tracker_0d06c36198ed402d11a57ca8
---

## GEO, последнее уточнение владельца 11.11.2026: главный заголовок первого экрана и основные заголовки всех шести разделов имеют Arial 600; внутренние заголовки карточек, включая две карточки первого экрана и тарифы, Arial 400. Основной текст Nunito; надзаголовочные плашки 16/14 px. Проверено в Edge 1366/390/320 px без переполнения; 9 тестов лендинга OK.
---
status: observation
category: decisions
scope: geo-tracker
source: User chips design request and browser checks
evidence: geo/web_assets/landing.html; HANDOFF.md; research/design/EVIDENCE-CHIPS-2026-11-11.png
event_id: journal_geo-tracker_dbfe578529f3af4421e21cf3
---

## GEO, 11.11.2026: по указанию владельца в карточке «Каждый вывод можно проверить» шесть плашек — «Запрос» первым, «Полный ответ», «Дата замера», «Источники», «Позиция», «Тональность». Цвета смешаны: голубая/белая заливки и прозрачные с белой обводкой; перенос по строкам. Edge 1366/1024/390/320 px: плашки внутри карточки, переполнения нет; 9 тестов лендинга OK.
---
status: observation
category: decisions
scope: geo-tracker
source: User added neural network chip
evidence: geo/web_assets/landing.html; HANDOFF.md; research/design/EVIDENCE-NEURAL-CHIP-2026-11-11.png
event_id: journal_geo-tracker_f81577949d32f34758ac2edc
---

## GEO 11.11.2026: в карточку «Каждый вывод можно проверить» добавлена седьмая плашка «Нейросеть», отдельной третьей строкой на компьютере; прозрачная, белые текст и обводка. На телефоне строки адаптируются по ширине. Edge 1366/390/320 px без горизонтального переполнения.
---
status: observation
category: decisions
scope: geo-tracker
source: User annotated chip color correction
evidence: geo/web_assets/landing.html; HANDOFF.md; user annotated screenshot
event_id: journal_geo-tracker_d61c7d8195025e7767b6ea93
---

## GEO 11.11.2026: по пометкам на скриншоте владелец уточнил цвета плашек карточки: «Полный ответ» — белая, «Дата замера» — голубая. Классы обновлены, цвета проверены в Edge.
---
status: observation
category: decisions
scope: geo-tracker
source: User heading wording correction
evidence: geo/web_assets/landing.html; HANDOFF.md
event_id: journal_geo-tracker_e1c1f057f72a20abe6d6bd28
---

## GEO 11.11.2026: владелец изменил заголовок карточки первого экрана на «Каждый ответ можно проверить» вместо «Каждый вывод можно проверить». Текст обновлён, локальный сервер отдаёт новую формулировку.
---
status: observation
category: decisions
scope: geo-tracker
source: User competitor block and sticky header requests
evidence: geo/web_assets/landing.html; HANDOFF.md; research/design/COMPETITORS-AND-GROWTH-2026-11-11.png; research/design/STICKY-LANDING-HEADER-2026-11-11.png
event_id: journal_geo-tracker_ea63e1097ad888925d171a0b
---

## GEO 11.11.2026: левая карточка первого экрана переделана под анализ конкурентов и рекомендации: «Изучайте конкурентов. Находите точки роста», строки «Сравнение с конкурентами», «Источники упоминаний», «Рекомендации по видимости». По следующему указанию шапка лендинга sticky сверху с белым фоном на всю ширину; якоря учитывают шапку (90 px). Edge 1366/1024/390/320 px: шапка остаётся сверху, якоря видимы, переполнения нет; 9 тестов лендинга OK.
---
status: observation
category: decisions
scope: geo-tracker
source: User heading punctuation correction
evidence: geo/web_assets/landing.html; HANDOFF.md
event_id: journal_geo-tracker_34955334a979893c756e4056
---

## GEO 11.11.2026: по просьбе владельца убраны обе точки из заголовка левой карточки первого экрана: «Изучайте конкурентов / Находите точки роста», перенос строки сохранён. Ответ локального сервера проверен.
---
status: observation
category: decisions
scope: geo-tracker
source: User auth close and prechecked consent requests; local browser and unittest checks
evidence: HANDOFF.md; geo/web_assets/auth-close.js; geo/web_assets/auth.js; geo/web_assets/login.html; geo/web_assets/app.html; geo/web_assets/app.css; research/design/AUTH-CLOSE-CONSENT-dark-900-2026-11-11.png
event_id: journal_geo-tracker_5625b8da2b4427948af4edd3
---

## GEO 11.11.2026: в форме входа/регистрации добавлен крестик; общий auth-close.js возвращает назад внутри сайта с восстановлением прокрутки, при прямом/внешнем входе ведёт /home. По явному указанию владельца в регистрации добавлено согласие на обработку персональных данных с галочкой по умолчанию; снятая галочка блокирует отправку в интерфейсе. Серверный учёт согласий не добавлен. Edge светлая/тёмная темы 1366/900/390/320 px, возврат из тарифов, клавиатура, обе формы и блокировка/отправка проверены; без ошибок JS и переполнения. 311 тестов OK, 3 skip.
---
status: observation
category: decisions
scope: geo-tracker
source: User hero logo illustration request; official assets and browser checks
evidence: HANDOFF.md; geo/web_assets/landing.html; geo/web_assets/ai-logos/sources.json; research/design/AI-LOGOS-HERO-1352-2026-11-11.png
event_id: journal_geo-tracker_0f6853f942122a2bb29fd26e
---

## GEO 11.11.2026: по скриншоту владельца добавлена композиция справа от главного заголовка: оригинальные значки ChatGPT, Claude, Gemini, Алиса AI, GigaChat, Perplexity в белых карточках с голубыми связями и знаком GEO в центре. SVG/PNG локальные, официальные источники в ai-logos/sources.json; без перекрашивания и внешних запросов браузера. До 900 px — строка значков, на телефоне без подписей. Edge 12 размеров 320–1920 px: все картинки загружены, без пересечения карточек, переполнения и ошибок JS. Первый экран помещается 1280x720/1366x768. 9 тестов лендинга OK.
---
status: observation
category: decisions
scope: geo-tracker
source: User orbital illustration sketch; local browser verification
evidence: HANDOFF.md; geo/web_assets/landing.html; research/design/AI-ORBITS-COMPOSITION-2026-11-11.png; research/design/AI-ORBITS-HERO-1686-2026-11-11.png
event_id: journal_geo-tracker_dfb2cbeff2da8e3f21649bee
---

## GEO 11.11.2026: по новому эскизу владельца композиция нейросетей первого экрана переделана в атом/планетную систему: три пересекающиеся эллиптические орбиты, 6 оригинальных логотипов в круглых планетах, голубое ядро GEO и звёзды. Прежние карточки и радиальные связи заменены. Цвета голубой/белый/графитовый; тексты и шрифты сохранены. До 900 px — компактная строка значков. Edge 9 размеров 320–1686 px: картинки загружены, значки не пересекаются, переполнения нет; 1280x720 и 1366x768 первый экран помещается. 9 тестов лендинга OK.
---
status: observation
category: decisions
scope: geo-tracker
source: User minimal hero and larger rotated graphite illustration request
evidence: HANDOFF.md; geo/web_assets/landing.html; research/design/MINIMAL-HERO-1461-2026-11-11.png; research/design/MINIMAL-HERO-320-2026-11-11.png
event_id: journal_geo-tracker_12f5ad61c137ef572d4f5ac4
---

## GEO 11.11.2026: по последнему скриншоту владельца упрощён первый экран — убраны его CTA/ссылка примера/подпись триала и две нижние карточки. Остальные секции и шапка сохранены. Описание теперь сразу под заголовком. Композиция нейросетей увеличена до 300–400 px по высоте, повёрнута на -11 градусов; логотипы компенсируют наклон. Центральный GEO — графитовый #23282f с белым кольцом, 84 px. На телефоне полная композиция под текстом вместо полосы значков. Edge 9 размеров 320–1461 px без переполнения, картинки загружены; 9 тестов лендинга OK.
---
status: observation
category: decisions
scope: geo-tracker
source: User raised hero and restored cards request
evidence: HANDOFF.md; geo/web_assets/landing.html; research/design/RAISED-HERO-RESTORED-CARDS-1393-2026-11-11.png
event_id: journal_geo-tracker_e1232440f5030520c9a99944
---

## GEO 11.11.2026: последнее уточнение владельца — поднять текст/иллюстрацию и вернуть две карточки первого экрана. Восстановлены «Изучайте конкурентов / Находите точки роста» и «Каждый ответ можно проверить» со всеми прежними строками и семью плашками. CTA остаются убранными. Вертикальное центрирование заменено верхним отступом 32 px; большая повёрнутая иллюстрация и графитовый GEO сохранены. Edge 10 размеров 320–1461 px без переполнения; на 1393x912 плашка y118, карточки до y756; 1280x720/1366x768 помещаются. 9 тестов лендинга OK.
---
status: observation
category: decisions
scope: geo-tracker
source: User spacing, CTA caption, solid white icon, account menu and opaque animated gradient requests
evidence: HANDOFF.md; geo/web_assets/landing.html; geo/web_assets/account-header.js; geo/web_assets/hero-orbits.js; geo/web.py; geo/billing.py; tests/test_landing.py; tests/test_onboarding.py; research/design/ORBIT-MOTION-QA-2026-11-11.json
event_id: journal_geo-tracker_8c92ed77ee31dabe2d88af8e
---

## GEO 11.11.2026: единые интервалы лендинга 100/20/30/40 px (секции на телефоне 64); кнопка «Попробовать бесплатно» в голубой карточке, подпись «7 дней тестового режима», белая залитая звезда в графитовой. Общая шапка: гостю «Вход / регистрация», вошедшему «Личный кабинет» с меню почты/тарифа/срока, переходом и выходом; реальные session/billing API, access_until учитывает прежние триалы без изменения подписок. Шесть логотипов движутся по трём орбитам: средний оборот 90 с и индивидуальные ограниченные ускорения/замедления. Орбиты сплошные и непрозрачные, цветовой градиент 18 с; без белых исчезающих бликов. Reduced-motion и пауза вне экрана/вкладки. 14 размеров 320–1920 px без переполнения; аналитические минимальные зазоры полного цикла: логотипы 10.66 px, центр 4.22 px, карточки 8.08 px. Профиль/вход/выход/ошибки API/мобильный вид проверены. 311 тестов OK (3 skip), финальные 9 лендинга OK. Сервис работает, Git не коммитили.
---
status: observation
category: decisions
scope: geo-tracker
source: User compact animation starting moment request
evidence: geo/web_assets/hero-orbits.js; geo/web_assets/landing.html; HANDOFF.md; research/design/COMPACT-ANIMATION-START-2026-11-11.png
event_id: journal_geo-tracker_a84344db40fa94a64d284a17
---

## GEO 11.11.2026: по просьбе владельца запуск анимации с момента, когда логотипы собраны ближе друг к другу. Начальная фаза 270.7 градуса (67.675 с исходного 90-секундного цикла), выбрана по минимальной сумме квадратов расстояний до центра за оборот с шагом 0.1 градуса. CSS-позиции до запуска JS также обновлены. Темпы, непрозрачный перелив и рассчитанные безопасные зазоры сохранены; старт и дальнейшее движение проверены в Edge 1366/390/320 px без переполнения.
---
status: observation
category: decisions
scope: geo-tracker
source: User smaller logos, faster orbit motion, moving gradient and breathing stars request
evidence: HANDOFF.md; geo/web_assets/landing.html; geo/web_assets/hero-orbits.js; research/design/SMALLER-LOGOS-STAR-MOTION-2026-11-11.png
event_id: journal_geo-tracker_3f3e57d18d99720a62a2e2ab
---

## GEO 11.11.2026: по просьбе владельца логотипы/бейджи в анимации уменьшены примерно на 10–15%, центральный знак до 76/60 px; средний оборот ускорен 90→75 с (+20%), компактная начальная фаза сохранена. Градиент вращается вдоль орбит с циклом 14 с, линии непрозрачны. Звёзды и точки мягко меняют размер/яркость в разных ритмах 5.6–7.6 с. Reduced-motion и пауза вне экрана применяются ко всем эффектам. Edge 1366/1280/901/900/390/320: зазоры положительные, градиент/звёзды движутся и останавливаются, ошибок JS/переполнения нет; 9 тестов лендинга OK.
---
status: observation
category: decisions
scope: geo-tracker
source: User alternating edge glow outside central 1440px request
evidence: HANDOFF.md; geo/web_assets/landing.html; geo/web_assets/hero-orbits.js; research/design/EDGE-GLOW-LEFT-1920-2026-11-11.png; research/design/EDGE-GLOW-RIGHT-1920-2026-11-11.png
event_id: journal_geo-tracker_975e84c113f7293a13f975ae
---

## GEO 11.11.2026: по просьбе владельца первому экрану добавлено мягкое голубое сияние по краям, попеременно слева/справа (18 с, сдвиг 9 с). Появляется только при окне шире 1440 px; основная зона вне центральных 1440 px, внутрь только затухающий хвост до 48 px, интенсивность ниже на 1441–1599 px. Не меняет сетку/клики. Пауза вне экрана/вкладки, статичный слабый вариант reduced-motion. Edge 9 размеров 320–2560 px, смена фаз/яркости и паузы проверены; переполнения/ошибок JS нет, 9 тестов лендинга OK.
---
status: observation
category: decisions
scope: geo-tracker
source: User additional colored glint request
evidence: HANDOFF.md; geo/web_assets/landing.html; research/design/EDGE-GLOW-TEAL-GLINT-1920-2026-11-11.png
event_id: journal_geo-tracker_9258022b54a404a199553c3a
---

## GEO 11.11.2026: к голубому краевому сиянию первого экрана добавлен более узкий светло-бирюзовый блик (#a0efdd/#75e5d4). Он отдельно смещается по вертикали за 26 с с обратным ходом, стороны со сдвигом по времени. Зона прежняя — окно >1440 px, основное свечение вне центральных 1440 px; пауза вне экрана и reduced-motion сохранены. Проверены оба слоя и их движение, ширины 320–2560 px без переполнения; 9 тестов лендинга OK.
---
status: observation
category: decisions
scope: geo-tracker
source: User white auth card, original blue backdrop, site logo, default offer/data consent and pointer-responsive code decoration requests
evidence: HANDOFF.md; geo/web_assets/login.html; geo/web_assets/app.html; geo/web_assets/app.css; geo/web_assets/auth.js; geo/web_assets/app.js; geo/web_assets/auth-background.js; research/design/WHITE-AUTH-BLUE-BACKGROUND-login-1366-2026-11-11.png
event_id: journal_geo-tracker_f8b7730dd9942e1a49500f37
---

## GEO 11.11.2026: форма входа/регистрации белая, фон по уточнению владельца восстановлен тёмно-синим #101b2a с синим градиентом. Локальная светлая тема формы не меняет тему кабинета. Внутри логотип сайта GEO / трекер со ссылкой на главную. Во входе/регистрации и встроенном /app — по умолчанию отмеченное согласие с офертой и обработкой персональных данных; снятое блокирует отправку в интерфейсе. Серверный учёт/документы не добавлялись. На синем фоне 8 декоративных элементов кода/нейрографов: мягкий отклик на мышь, подсветка и параллакс, aria-hidden/pointer-events none; reduced-motion и touch учитываются. Edge 1366/900/390/320, обе схемы и тёмный кабинет: белая форма/синий фон, без переполнения; мышь, согласия и логотип проверены, без JS ошибок. 9 лендинга + 4 онбординга OK.
---
status: observation
category: decisions
scope: geo-tracker
source: Запросы владельца: форма проекта, конкуренты, кнопки ИИ, быстрое сохранение и прогресс
evidence: Поручения владельца и эскизы 12.11.2026; E:/GEO-рассылка/HANDOFF.md; tests/test_brand_profile.py; research/design/BRAND-PROFILE-QA-2026-11-12.json и qa_brand_profile.py
event_id: journal_geo-tracker_7844595592cdc9b06399f3c7
---

## GEO 12.11.2026: реализовано окно настройки проекта по эскизам владельца. Слева голубая плашка, пояснение и прогресс Шаг N из 3. Первый этап: проект, бренд, сайт, единые варианты написания, описание, две отдельные кнопки Заполнить ИИ и все 7 нейросетей отмечены изначально. Сохранить проект работает по одному сайту: пустое имя проекта Проект 1, далее свободный номер; пустой бренд домен. Сохранение сразу, затем конкуренты с сайтами и редактируемыми предложениями ИИ, затем экран готовности. Выбор моделей учитывается до лимита/оценки в web, rerun, CLI и daily. Добавлено удаление бренда с подтверждением и tenant-изоляцией. Схема v8, отдельный ledger черновиков с raw/cost/tokens, кэш по этапу/описанию и лимит 10 в сутки; публичные IP закреплены, редиректы проверяются, автоматических платных повторов нет. ИИ выбран настроенный GigaChat; живых платных запросов в QA не было. Браузер Edge 1366/390/320, отдельная временная база, редактирование во время генерации, сбой ИИ, создание по одному сайту и удаление проверены. 407 unittest OK, 3 skip; положительные контроли изоляции и приватного IP подтверждены. Live v8 integrity ok, сохранены 5 брендов/29 вопросов/69 прогонов/50 ответов, backup сделан, сервис 8000 обновлён. Код не закоммичен и не опубликован.
---
status: observation
category: decisions
scope: geo-tracker
source: Последние уточнения: все поля необязательны, номер пустого проекта, ИИ и иконки; устранение устаревшего процесса 8099
evidence: Запросы и эскизы владельца 12.11.2026; HANDOFF.md, geo/web_assets/brand-onboarding.js, tests/test_brand_profile.py, research/design/BRAND-PROFILE-QA-2026-11-12.json; сравнение живых API 8000/8099
event_id: journal_geo-tracker_a162f21580f2d1d2fe280b25
---

## GEO 12.11.2026, последнее уточнение владельца: все поля формы необязательны, полностью пустой проект сохраняется сразу с именами Проект 1, Проект 2, Проект 3 по свободному номеру. Синяя приписка о возможной неточности появляется после нажатия Сохранить и не блокирует. Лишний список/пояснение слева убраны. Зелёные кнопки со звёздочкой у двух полей; успешное автозаполнение по сайту меняет текст на Заполнено ИИ, ручная правка снимает метку. Оба поля заполняются одним запросом после ввода сайта, старый ответ при смене сайта отбрасывается, новый ставится в очередь. Без сайта кнопка фокусирует адрес и не вызывает модель. 7 подлинных локальных логотипов с выбором мышью/клавиатурой, все отмечены изначально. Важный найденный дефект: старый процесс GEO на порту 8099 от 11.11 22:40 отдавал свежую статику, но старый API (404 brand-profile/options и требование хотя бы одного вопроса). Новый 8000 уже отвечал правильно. Обновлены оба сервера, у 8099 сохранены cwd и окружение с GEO_DB_PATH=state/geo.sqlite3; backup geo-8099-pre-update-20261112-010627.sqlite3, фоновый лог state/geo-8099.log. При следующих правках обновлять оба порта. Wondershare 8090 не трогать. API обоих портов options200/7 моделей/no-store; JSON и fetch формы не кэшируются. 410 unittest OK с 3 skip, браузер Edge1366/390/320 на временной базе и чтение живой формы без записи проекта/платных запросов. Код не закоммичен и не опубликован.
---
status: observation
category: decisions
scope: geo-tracker
source: Новые экраны конкурентов и запросов по эскизам владельца
evidence: Эскизы владельца: конкурент бренд-сайт-синонимы и запросы на третьем шаге; HANDOFF.md; tests/test_brand_profile.py; research/design/BRAND-PROFILE-QA-2026-11-12.json и PNG
event_id: journal_geo-tracker_7a53f2213cc59de33a4c47ac
---

## GEO 12.11.2026, следующие эскизы владельца: на втором шаге зелёная кнопка со звёздочкой как на первом справа от заголовка, первая карточка конкурента сразу на экране; бренд/сайт/синонимы, Добавить ещё конкурента. Поля необязательные. Синонимы сохраняются в competitor_profiles_json, модель также предлагает варианты; runner и CLI recount распознают алиасы/hostname с одной канонической сущностью конкурента. Третий шаг вместо Готово теперь Запросы для поиска: ввод по строкам, редактирование перед сохранением, можно пропустить. Batch API сохраняет новые вопросы атомарно, удаляет дубли, проверяет tenant и лимит всего набора; пустой набор не блокируется. Вопросы видны в кабинете до первого прогона (renderQuestions до empty-return). 413 unittest OK, 3 skip; браузер Edge1366/390/320, карточка по умолчанию/добавление/синонимы/три шага/назад/вопросы/дубли/пустые поля проверены без платных запросов. Положительный контроль batch-изоляции подтверждён. Оба сервера 8000/8099 обновлены и проверены: актуальный batch200 с пустым набором без записи, новая форма отдаётся. Схема v8 без новых миграций. Код не закоммичен и не отправлен.
---
status: observation
category: decisions
scope: geo-tracker
source: Кнопка ИИ у запросов для поиска по эскизу владельца
evidence: Последний эскиз владельца: кнопка ИИ над запросами; HANDOFF.md; geo/brand_profile.py; geo/web_assets/brand-onboarding.js; tests/test_brand_profile.py; research/design/BRAND-PROFILE-QA-2026-11-12.json
event_id: journal_geo-tracker_6056dd52a9a05f740b50da93
---

## GEO 12.11.2026: по просьбе владельца у запросов третьего шага справа добавлена зелёная кнопка со звёздочкой Заполнить ИИ. Модель предлагает до 8 конкретных вопросов по сайту или описанию; без обоих фокус сайта на первом шаге, без вызова модели. kind=questions в общем draft API/ledger: исходный ответ, токены, стоимость, отдельный кэш, прежний лимит 10/сутки; нет отдельной миграции. Дубли/каноническое имя бренда в предложениях отбрасываются, лимит добавления вопросов проверяется до траты. Генерация только заполняет редактируемый список, не сохраняет вопросы и не запускает измерения. Ручной ввод во время генерации защищён; сбой не блокирует ввод/сохранение; кнопка Заполнено ИИ после применения. 416 unittest OK, 3 skip, браузер Edge1366/390/320 с генерацией на фикстуре/правками/ошибкой/сохранением, платных запросов0. Обновлены оба сервера8000/8099 и проверены на живых адресах без записи проекта/платного вызова. Схема v8, код не закоммичен и не опубликован.
---
status: observation
category: decisions
scope: geo-tracker
source: Сворачиваемые конкуренты и заголовок первого шага
evidence: Эскиз владельца со сворачиванием карточек конкурентов и заголовок Заполните свой проект; HANDOFF.md; geo/web_assets/brand-onboarding.js и app.css; research/design/qa_brand_profile.py, BRAND-PROFILE-QA-2026-11-12.json, brand-competitors-accordion-*.png
event_id: journal_geo-tracker_0e9df163436ac019cc680d48
---

## GEO 12.11.2026: владелец попросил сворачивать заполненных конкурентов в плашки с именем и внутреннюю прокрутку, затем поменял заголовок первого шага на Заполните свой проект. Реализованы native details/summary: при уходе фокуса из заполненной карточки или добавлении следующей карточка закрывается, клик/Enter/Space по имени открывает её с сохранёнными брендом/сайтом/синонимами. Переход между полями не закрывает карточку. Удаление доступно на плашке, последняя удалённая заменяется пустой. Новая карточка получает фокус, список прокручивается к ней; высота списка ограничена, прокрутка внутри модального окна, вне списка остаются кнопки. Значения свёрнутых полей сохраняются. Только статика, без изменений backend/БД/платных вызовов. Полный browser QA Edge1366/390/320 на временной базе: раскрытие/сворачивание, правка имени/синонимов, клавиатура, удаление, длинный список и видимость полей новой карточки, прежний трёхшаговый сценарий и сохранение без JS ошибок. Новые статика/заголовок отдаются обоими серверами8000/8099 без их перезапуска. Предыдущий полный unittest416 OK,3skip; новый полный набор не повторялся для правки статики. Код не закоммичен и не опубликован.
---
status: observation
category: decisions
scope: geo-tracker
source: Кнопка сохранения карточки конкурента, убрать стрелку
evidence: Эскиз владельца с кнопкой Сохранить и без стрелки в карточке конкурента; HANDOFF.md; geo/web_assets/brand-onboarding.js, app.css; research/design/qa_brand_profile.py и BRAND-PROFILE-QA-2026-11-12.json
event_id: journal_geo-tracker_ccd80738f5fa4102fd5af66b
---

## GEO 12.11.2026: по эскизу владельца в карточке конкурента под полями справа добавлена кнопка Сохранить. Она применяет введённое в текущей форме, обновляет название плашки, сворачивает карточку и переводит фокус на summary; общая Сохранить проект по-прежнему записывает карточки в проект. Кастомная стрелка раскрытия удалена, нативный маркер скрыт; название кликабельное, Enter/Space, автосворачивание и удаление сохранены. Кнопка type=button, не отправляет весь wizard; поля необязательны. Только статика, без backend/миграций. Browser QA Edge1366/390/320: кнопка, отсутствие стрелки, сохранение полей при раскрытии и общем сохранении, длинный список и все прежние шаги без JS ошибок и платных вызовов. Оба сервера8000/8099 отдают текущий скрипт, перезапуск не потребовался. Предыдущий полный unittest416 OK,3skip, для этой правки не повторялся. Код не закоммичен и не опубликован.
---
status: observation
category: decisions
scope: geo-tracker
source: Кнопка карточки на всю ширину
evidence: Запрос владельца сохранить на всю ширину; geo/web_assets/app.css; проверка геометрии в браузере на обоих портах
event_id: journal_geo-tracker_5f796543010c0f68967d132f
---

## GEO 12.11.2026: по следующему уточнению владельца кнопка Сохранить внутри карточки конкурента растянута на всю ширину (width100%). Проверена геометрия в Edge1366/390/320 на обоих живых адресах8000/8099: ширина кнопки равна ширине контейнера. Только CSS, без записей данных/платных вызовов; HANDOFF обновлён.
---
status: observation
category: decisions
scope: geo-tracker
source: Подтверждение удаления конкурента
evidence: Запрос владельца о подтверждении при крестике; geo/web_assets/brand-onboarding.js; HANDOFF.md; research/design/qa_brand_profile.py и BRAND-PROFILE-QA-2026-11-12.json
event_id: journal_geo-tracker_0b261062a97faf990905b276
---

## GEO 12.11.2026: крестик удаления карточки/плашки конкурента теперь требует подтверждения Точно удалить конкурента с названием, либо Точно удалить этого конкурента для пустой карточки. Отмена сохраняет карточку и поля; подтверждение удаляет её из текущей формы, общая Сохранить проект по-прежнему записывает изменения. Крестик закрытия всего диалога не менялся. Browser QA на временной базе проверил отмену с сохранёнными синонимами, подтверждение, последнюю карточку и прежний сценарий1366/390/320 без JS ошибок и платных вызовов. Актуальный скрипт на обоих портах8000/8099. Только JS, backend/БД не менялись, коммита/публикации нет.
---
status: observation
category: decisions
scope: geo-tracker
source: Codex: project editing and 30-day archive
evidence: E:\GEO-рассылка\HANDOFF.md; geo/project_archive.py; tests/test_project_archive.py; research/design/BRAND-PROFILE-QA-2026-11-12.json
event_id: journal_geo-tracker_42ce8aa02c352da4077f756c
---

## GEO 2026-11-12: в списке проектов графитовый карандаш открывает первый экран с Сохранить изменения. Удалить проект внутри формы требует белого подтверждения и переносит в архив на 30 дней; восстановление и окончательное удаление доступны в архиве. Схема9, фоновая очистка60с и при старте/чтении архива; архив исключён из активных прогонов/расписания. Каскадное удаление сохраняет анонимный агрегат расходов/лимитов. Тестирование запросов на третьем шаге сохраняет выбранные ID, проверяет лимиты до трат; недостающие название, сайт или описание, конкурент и запрос показаны белой формой. Обычное пустое сохранение остаётся Проект N. 427 unittest OK, 3 skip; Edge1366/390/320, положительный контроль изоляции архива. Оба порта8000/8099 обновлены, integrity OK; живые5брендов/28вопросов/61прогон/47ответов/4пользователя сохранены. Бэкап до миграции state/backups/geo-20261112-100916.sqlite3. Платных QA обращений, коммита и push не было.
---
status: observation
category: decisions
scope: geo-tracker
source: Codex: archive modal UI refinement
evidence: E:\GEO-рассылка\HANDOFF.md; geo/web_assets/app.html; geo/web_assets/app.js; geo/web_assets/app.css; research/design/qa_brand_profile.py; research/design/project-archive-dialog-1366.png
event_id: journal_geo-tracker_a4674679c75de41be3111305
---

## GEO 2026-11-12 уточнение архива: вместо постоянного блока под списком брендов кнопка Архив рядом с Добавить бренд открывает отдельное белое окно, фон60%. У удалённых проектов справа две круглые графитовые кнопки: стрелка восстановить и крестик удалить окончательно. Подтверждение центрируется над окном архива; Escape/крестик/фон закрывают архив, фокус возвращается. Срок30 дней и backend не менялись. Браузер Edge1366/390/320 на временной базе: открытие, круглые кнопки, восстановление, отмена и удаление, отсутствие переполнения/JS ошибок. Оба порта8000/8099 отдают свежую статику, реальные проекты не менялись.
---
status: observation
category: decisions
scope: geo-tracker
source: Codex: project search and scrollable archive
evidence: E:\GEO-рассылка\HANDOFF.md; geo/web_assets/app.html; geo/web_assets/app.js; geo/web_assets/app.css; research/design/qa_brand_profile.py; research/design/project-archive-scroll-1366.png
event_id: journal_geo-tracker_500becf9870eea60dabdd15c
---

## GEO 2026-11-12: независимый мгновенный поиск по названию проекта, бренду и сайту добавлен в Бренды и Архив. Регистр и ё/е игнорируются, пустой результат объясняется, очистка возвращает список, фильтр применяется после обновления. В архиве прокручивается только список карточек, поиск/заголовок/закрытие остаются сверху. Восстановление — голубой круг, удаление — белая корзина на графитовом круге с прежним подтверждением. Edge QA на временной базе: поиск по3 полям, пустой результат/очистка,30 архивных фикстур, скролл1366/390/320 без переполнения/JS ошибок. Статика обоих портов8000/8099 актуальна; живые данные не менялись.
---
status: observation
category: decisions
scope: geo-tracker
source: Codex: restore brand menu styling, preserve scoped navigation
evidence: E:\GEO-рассылка\HANDOFF.md; geo/web_assets/app.html; geo/web_assets/app.css; geo/web_assets/app.js; research/design/qa_brand_navigation.py; research/design/brand-navigation-1366.png; ответ владельца о возврате нового меню до Мои компании
event_id: journal_geo-tracker_8b6ac649b00d6ba96e9fbb7d
---

## GEO 2026-11-12: владелец уточнил возврат нового меню до замены на Мои компании. Сохранён логотип сайта, Бренды с графитовым плюсом справа, список брендов с одиночной галочкой, спокойная голубая плашка, вложенные разделы выбранного бренда. Отменены Мои компании/синий плюс рядом/яркая плашка. Тариф аккаунта внизу отдельно. Выбор сохраняется на пользователя в sessionStorage; старые ответы dashboard не перетирают новый выбор. Исправлена передача brand_id при записи действия и brand у readiness; очистка старых источников/задач/действий при переходе к пустому бренду, отчёты готовности отдельно по бренду. 427 unittest OK,3skip; полный старый QA и новый qa_brand_navigation.py с двумя брендами/1366/390/320 без JS ошибок, сети и платных вызовов. Оба8000/8099 актуальны, реальные проекты не менялись.
---
status: observation
category: decisions
scope: geo-tracker
source: Codex: branch connectors from user reference
evidence: E:\GEO-рассылка\HANDOFF.md; geo/web_assets/app.css; research/design/qa_brand_navigation.py; research/design/brand-navigation-1366.png; пояснение владельца к последнему фото
event_id: journal_geo-tracker_ba14d49dde0c5066d6f4077a
---

## GEO 2026-11-12: владелец пояснил последнее фото — подразделы выбранного бренда соединить вертикальной линией с короткими горизонтальными полосками к иконкам. Добавлено CSS-дерево меню с тонкими серо-голубыми линиями у7 подразделов; от нижнего края списка брендов до последней ветки. Декоративные линии не перехватывают клики; мобильная горизонтальная навигация сохранена. Browser QA с двумя брендами1366/390/320 пройден, PNG brand-navigation-1366.png. Свежая CSS на8000/8099, живые данные не менялись.
---
status: observation
category: decisions
scope: geo-tracker
source: Codex: section label My brands
evidence: E:\GEO-рассылка\geo\web_assets\app.html; HANDOFF.md; прямое указание владельца мои бренды напиши в разделе
event_id: journal_geo-tracker_39947d4736c1888f28b99ce6
---

## GEO 2026-11-12: по прямому уточнению владельца название раздела в меню и заголовок страницы изменены с Бренды на Мои бренды. Плюс, спокойная плашка и дерево подразделов сохранены. Оба порта8000/8099 отдают новое название.
---
status: observation
category: decisions
scope: geo-tracker
source: Codex: portfolio dashboard above brand list
evidence: E:\GEO-рассылка\HANDOFF.md; geo/portfolio.py; geo/web.py; geo/web_assets/app.html; geo/web_assets/app.js; geo/web_assets/app.css; tests/test_portfolio.py; research/design/PORTFOLIO-QA-2026-11-12.json
event_id: journal_geo-tracker_dcd5c223b4f6c99a2f75ab5b
---

## GEO 2026-11-12: перед списком Мои бренды добавлены KPI активных брендов/видимости/упоминаний, дневной график и графитовая CTA добавить бренд; ниже прежние поиск/список/архив. Неделя7/Месяц30 независимы от обзора бренда. Новый read-only GET/api/brands/overview, geo/portfolio.py: только tenant/активные бренды, веса по успешным ответам, алиасы дедуплицированы, ошибки отдельно, mock/архив исключены; точные окна с сегодняшним днём и предшествующим периодом, без данных null, без прошлого delta null, разрывы графика на пустых днях. Схема9 без миграции. 432 unittest OK,3skip; положительный контроль tenant SQL падает без защиты. QA пустого/заполненного аккаунта и CTA/периодов/поиска/архива1366/768/390/320 без переполнения/JS ошибок/платных вызовов, прежние wizard/navigation QA пройдены. Оба8000/8099 обновлены, integrity OK, живые5брендов/28вопросов/61прогон/47ответов/4пользователя сохранены. Коммита и push не было.
---
status: observation
category: decisions
scope: geo-tracker
source: Codex: brand list caption
evidence: E:\GEO-рассылка\geo\web_assets\app.html; HANDOFF.md; указание владельца список брендов
event_id: journal_geo-tracker_cf378ea9d41e7c73a9266b74
---

## GEO 2026-11-12: заголовок панели под сводкой заменён с Ваши бренды на Список брендов по уточнению владельца. Название страницы и меню Мои бренды сохранено. Статика8000/8099 проверена.
---
status: observation
category: decisions
scope: geo-tracker
source: Codex: explicitly requested fictional design preview
evidence: E:\GEO-рассылка\HANDOFF.md; scripts/build_design_preview.py; geo/web_assets/design-preview.js; geo/web_assets/design-preview.json; research/design/qa_design_preview.py; research/design/DESIGN-PREVIEW-QA-2026-11-12.json
event_id: journal_geo-tracker_c95837db5b414046af876fa8
---

## GEO 2026-11-12 по явному запросу владельца добавлены вымышленные бренды/статистика для дизайна в отдельном /design, тот же app UI с постоянной плашкой вымышленных данных. Север Кофе рост, Листва снижение, Пиксель Бюро умеренно, Новый проект пустой.60 дней/3 модели,7/30/90, конкуренты/источники/задачи/действия/готовность/архив. scripts/build_design_preview.py строит временную SQLite и JSON (~307KB), рабочую БД/ключи/сеть не использует. design-preview.js appFetch читает фикстуру только на /design; мутации409, модели/экспорт выключены; на /app обычный fetch. Вход из ссылки Мои бренды, выход из плашки. Неверсионированная статика revalidate для импортов.433 unittest OK,3skip; QA1440/390/320 без JS ошибок и реальных API-запросов, мутации не меняют БД. Положительный контроль обхода адаптера вызывает реальный GET session. Оба8000/8099/design HTTP200, проверен живой макет;5реальныхбрендов/28вопросов/61прогон/47ответов/4пользователя сохранены, integrity OK. Коммита/push не было.
---
status: observation
category: decisions
scope: geo-tracker
source: Codex: research and proposed navigation, not yet adopted
evidence: E:\GEO-рассылка\HANDOFF.md; research/design/NAVIGATION-PROPOSAL-2026-11-12.md; geo/web_assets/menu-concept.html; geo/web_assets/menu-concept.js; research/design/menu-proposal-1440.png
event_id: journal_geo-tracker_b8fc65728ddc804d34458e4f
---

## GEO 2026-11-12 исследование меню по запросу владельца: официальные Peec AI/OtterlyAI/Semrush, NN/g единственный выбор, Carbon вложенность. Рекомендация: Мои бренды отдельно, компактный переключатель одного бренда с поиском/добавлением,6 разделов Обзор/Запросы и ответы/Конкуренты/Источники/План улучшений/Проверка сайта; План включает Рекомендации/Задачи/История работ; Настройки бренда отдельно, Тариф и оплата/Помощь снизу. Линии сохранены, единые SVG, на телефоне выезжающее меню. Создан отдельный /static/menu-concept.html +JS, документация NAVIGATION-PROPOSAL-2026-11-12.md со ссылками. Статус только предложение, владельцем ещё не принято; рабочее меню не менялось. Browser1440/390/320 поиск/смена бренда с сохранением раздела/вкладки/локальное добавление/Escape/mobile без JS ошибок/переполнения/API запросов. Клиентские данные не менялись.
---
status: observation
category: decisions
scope: geo-tracker
source: Codex: approved navigation implemented in app and design preview
evidence: E:\GEO-рассылка\HANDOFF.md; geo/web_assets/app-navigation.js; geo/web_assets/app.html; geo/web_assets/app.js; geo/web_assets/app.css; geo/web_assets/brand-onboarding.js; research/design/NAVIGATION-INSTALLED-QA-2026-11-12.json; подтверждение владельца да внедри
event_id: journal_geo-tracker_76e8589ac5208d1ae3f17b12
---

## GEO 2026-11-12 владелец утвердил меню командой да внедри. Новая навигация внедрена в /app и /design: Мои бренды, один бренд в поисковом переключателе с добавлением,6 разделов Обзор/Запросы и ответы/Конкуренты/Источники/План улучшений/Проверка сайта. В План перенесены прежние рекомендации/задачи/история, старые view алиасы работают. Настройки открывают прежнюю форму, успешное сохранение возвращает в текущую вкладку; архив сохранён. Общие SVG/линии/счётчик реальных задач/строка навигации. Тариф и оплата/Помощь снизу, справка реализована. Мобильное выезжающее меню с inert фоном, удержанием/возвратом фокуса; поиск/Escape и сохранение вкладки при смене бренда. 433 unittest OK,3skip; wizard/navigation/design/portfolio QA пройдены на временных базах,34бренда1440/390/320/высота568 со скроллом/кнопкой добавления. Живые8000/8099 актуальны, новый макет проверен без API вызовов;5реальныхбрендов/28вопросов/61прогон/47ответов/4пользователя сохранены. Backend/схема не менялись, коммита/push не было.
---
status: observation
category: decisions
scope: geo-tracker
source: Codex: competitor comparison charts
evidence: E:\GEO-рассылка\HANDOFF.md; E:\GEO-рассылка\research\design\COMPETITOR-COMPARISON-2026-11-12.md; E:\GEO-рассылка\research\design\COMPETITOR-CHARTS-QA-2026-11-12.json
event_id: journal_geo-tracker_67c641abfa30c9bf7125c752
---

## В GEO внедрён экран сравнения конкурентов в общих /app и /design: KPI доли ответов, места и лидера; столбцы процентов/числа упоминаний, кольцо долей, динамика с переключателями линий и таблица ролей. Источник существующий timeline с DISTINCT успешными ответами: повторные цитаты не удваивают счётчик, ошибки вне знаменателя, пропущенные даты разрывают линии, отсутствие замеров не подменяется нулём. Доля ответов прямо отделена от взвешенной mention_rate обзора и от доли упоминаний кольца. Периоды 7/30/90 синхронны с обзором, добавление и роли конкурентов сохранены. Свой бренд голубой. Ориентиры официальные Semrush/OtterlyAI/Peec. Проверены 433 unittest OK (3 skip), qa_competitor_charts, qa_brand_navigation, qa_design_preview, ширины 1440/768/390/320. Живые /design 8000/8099 работают без продуктовых API; рабочая база не наполнялась. Коммит и push не выполнялись.
