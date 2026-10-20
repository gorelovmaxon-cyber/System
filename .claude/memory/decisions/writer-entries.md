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
