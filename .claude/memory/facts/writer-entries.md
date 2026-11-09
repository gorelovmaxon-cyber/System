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
---
status: confirmed
category: facts
scope: site-portfolio
source: Беседа 2026-10-13 и локальные проверки кандидата MAXMADE
evidence: Выводы id, ss, systemctl, dpkg, ufw, nft, iptables, sshd -T и df в беседе; audit/READINESS.md и audit/PUBLICATION-PLAN.md отдельного снимка audit/vps-readiness-20261013
event_id: maxmade_vps_audit_20261013
---

## MAXMADE 2026-10-13: по выводам пользователя VPS Ubuntu 24.04 доступен через SSH root на порту 22 по паролю; свободно 53 ГБ, пакеты веб-стека выбранным фильтром не найдены, UFW неактивен, nftables пуст, iptables ACCEPT. Отдельный локальный снимок подготовки проходит сборку, 35 PHP unit и 37 HTTP-проверок на PHP 8.3/MySQL 8.0. schema.sql относится к D1/SQLite; таблицы MySQL создаёт PHP. Реальная доставка Telegram и работа на VPS не проверены; сервер не изменялся, публикация не выполнялась.
---
status: confirmed
category: facts
scope: site-portfolio
source: Беседа 2026-10-14: разрешение подготовки VPS и фактическое исполнение через SSH
evidence: E:/MAXMADE-vps-audit-20261013/audit/vps/VPS-PREP-20261014.md; audit/vps/evidence/final-check.txt; health-get.json; health-upload10.json; health-upload-limit.json; фактический повторный Windows OpenSSH maxmade-admin sudo -n id uid=0
event_id: maxmade_vps_prep_20261014
---

## MAXMADE 2026-10-14: по разрешению пользователя агент настроил VPS 185.250.47.204: Nginx/PHP-FPM 8.3/MySQL 8.0, UFW только SSH22, fail2ban, key-only SSH, maxmade-admin с sudo, приватные config/uploads, backup timer и проверка restore. Реальные HTTP проверки стека и лимитов вложений проходят; финальный осмотр PASS, 0 failed units, MySQL/Nginx только loopback. Сайт не переносился и не публиковался; эталон v5 и чужая release-prep не изменялись. Kernel147 установлен, работает146, reboot-required; перезагрузка не выполнена ввиду прежнего запрета пользователя. Telegram API HTTPS timeout, реальная доставка не проверена. Root пароль консоли прежний; root password-only SSH отключён. Подключения ключом проверяют saved known_hosts; независимая сверка через провайдера не выполнена. Приватные ключи/пароли/архивы вне Git; подробности и следующий шаг в собственном HANDOFF.
---
status: confirmed
category: facts
scope: site-portfolio
source: Беседа 2026-10-14: явное разрешение перезагрузки и фактическое исполнение SSH
evidence: E:/MAXMADE-vps-audit-20261013/audit/vps/evidence/post-reboot-identity.txt; post-reboot-infrastructure.txt; post-reboot-final-check.txt; фактический Windows OpenSSH maxmade-admin sudo -n id uid=0
event_id: maxmade_vps_reboot_20261014
---

## MAXMADE VPS 2026-10-14: после явного разрешения пользователя да, делай выполнена одна перезагрузка в 16:35 UTC. Новый boot ID подтверждён по свежему SSH, работает ядро 6.8.0-147-generic, reboot-required отсутствует. Сеть eth0 поднялась автоматически с прежним IP185.250.47.204/gateway185.250.47.1; root/maxmade-admin ключом и sudo проверены. После reboot повторно проходят Nginx/FPM/MySQL и HTTP uploads10MiB/превышение/13MiB413, private storage и cookies. Все службы active, 0 failed units, UFW разрешает только SSH22, MySQL/Nginx только loopback, backup timer active. Временные endpoint/таблицы/файлы удалены; сайт не переносился и не опубликован. Telegram HTTPS timeout сохраняется, доставка не готова. Три phased10% обновления не форсировались. Эталон v5 и чужая release-prep не изменялись.
---
status: confirmed
category: facts
scope: site-portfolio
source: Беседа 2026-10-14: поручение домена и Telegram, ответы о Proxifier и созданном боте
evidence: E:/MAXMADE-vps-audit-20261013/audit/vps/TELEGRAM-DOMAIN-PENDING-20261014.md; фактические DNS/curl/iptables/RDAP/TCI WHOIS/certbot SSH проверки в беседе
event_id: maxmade_tls_proxy_pending_20261014
---

## MAXMADE 2026-10-14: пользователь поручил решить Telegram и домен/HTTPS. Certbot2.9.0/timer/deploy hook установлен и проверен; сертификата пока нет. По публичным Verisign RDAP/TCI WHOIS maxmade.com зарегистрирован1999, maxmade.ru2025; оба указывают на другие серверы, принадлежность пользователю не доказана. maxmade-studio.ru/maxmade-web.ru WHOIS No entries found на дату проверки; пользователь пока не выбрал/не купил домен. Telegram API доступен с ПК и недоступен напрямую с VPS при одинаковом DNS и OUTPUT ACCEPT. Найден свой профиль Proxifier4, его прокси доступен с VPS и требует авторизацию HTTP407. Существующий профиль не менялся; пароль зашифрован, запрошен отдельный No encryption экспорт в защищённую локальную .ssh папку, файла пока нет. Proxy scripts draft, не применены. Пользователь подтвердил бот создан, token/получатель не получены, реальных сообщений нет. Работа не завершена и требует этих входных данных.
---
status: confirmed
category: facts
scope: site-portfolio
source: Беседа MAXMADE 2026-10-14, экспорт Disabled и фактическая настройка/проверка прокси
evidence: E:/MAXMADE-vps-audit-20261013/audit/vps/evidence/post-proxy-infrastructure.txt; post-proxy-final-check.txt; proxy-health-*.json; фактический credentialed curl CONNECT200/http302/tls0; private backup verification и Windows SSH sudo uid0 в беседе
event_id: maxmade_telegram_proxy_ready_20261014
---

## MAXMADE 2026-10-14: пользователь повторно экспортировал Proxifier Default.ppx с Encryption mode disabled. Экспорт перемещён из E:/Downloads в защищённую .ssh папку, ACL только пользователя, значения паролей не выводились. Прокси успешно настроен на VPS: авторизованный CONNECT200, Telegram302/TLS verification0, настоящий Nginx/FPM health показывает telegram_https_reachable=true. Proxy URL в root-only EnvironmentFile0600, env только пулу MAXMADE; Windows Proxifier для VPS не нужен. HTTP/MySQL/private storage/upload limits/session cookies PASS, 0 failed units, прежние SSH/firewall/loopback порты сохранены. Proxy env/FPM/dropin включены в приватный backup и последняя копия скачана вне Git. Токен бота и подтверждённый получатель ещё не получены, сообщения не отправляли, Telegram в приложении выключен. Создан защищённый пустой .ssh/maxmade_telegram_token.txt; пользователь должен заполнить токен. maxmade-studio.ru выбран, покупка/DNS/HTTPS ещё не подтверждены.
---
status: confirmed
category: facts
scope: site-portfolio
source: Беседа MAXMADE 2026-10-14, ответ готово на файл токена и фактические проверки
evidence: E:/MAXMADE-vps-audit-20261013/audit/vps/evidence/bot-identity.json; фактические readonly check-telegram-bot.py identity/chats в беседе; удаление временных файлов подтверждено
event_id: maxmade_bot_identity_verified_20261014
---

## MAXMADE 2026-10-14: пользователь заполнил защищённый локальный файл bot token. Readonly getMe/getWebhookInfo с VPS через прокси прошли: бот @websaitProMax_bot, webhook отсутствует, TLS verification0. Токен не попадал в argv/Git/вывод; временные root-only PHP/token файлы удалены. getUpdates без offset показал0 private chats, updates не подтверждались, переписка не выводилась. Пользователю предложен /start в этом боте со своего аккаунта. Получатель ещё не подтверждён, реальных сообщений не отправляли, application Telegram выключен; далее private chat ID/config и согласованный тест доставки. Выбран maxmade-studio.ru, покупка/DNS/HTTPS ещё не подтверждены.
---
status: confirmed
category: facts
scope: site-portfolio
source: Беседа MAXMADE 2026-10-14: /start, явное согласие на1 тест и фактическая отправка/настройка
evidence: E:/MAXMADE-vps-audit-20261013/audit/vps/evidence/telegram-config-prepared.json; telegram-test-staged.json; telegram-delivery-test.json; явное разрешение пользователя и finish-telegram-preparation.sh/backup/WHOIS в беседе
event_id: maxmade_telegram_delivery_verified_20261014
---

## MAXMADE 2026-10-14: после /start пользователя readonly API нашёл private chat @GnewsMm; getChat подтвердил получателя. Private server config получил token/chat ID без вывода секретов. Пользователь явно разрешил одно тестовое сообщение: MAXMADE: тест уведомлений с VPS. Подключение Telegram работает. Реальный telegram_notice_transport из подготовленного кандидата отправил ровно1 сообщение; API status sent, без автоматических повторов. Это не подтверждение прочтения пользователем. Private config Telegram enabled=true, backup обновлён и скачан вне Git; временные тестовые sources удалены, attempt marker оставлен root-only. Сайт не размещён, цепочка заявка-БД-Telegram после публикации ещё не проверена. Пользователь сообщил, что maxmade-studio.ru пока не куплен; свежий WHOIS No entries found, далее покупка в кабинете пользователя/DNS/HTTPS.
---
status: confirmed
category: facts
scope: system-of-site
source: Прямой запрос пользователя 2026-10-15 и локальная UI правка с проверками
evidence: E:/system-of-site-app-intake-20261012/.local/skip-hover-check-20261015.log; skip-hover-browser-20261015.log; skip-hover-legacy-browser-20261015.log; .local/sector-survey-evidence/survey-skip-hover-1440.png и390.png; live CSS18249
event_id: skip_question_hover_width_20261015
---

## 2026-10-15: по прямому запросу пользователя расширена кнопка Пропустить вопрос в опросе app-intake-20261012, frontend/src/SurveyShell.css: min-width180px, горизонтальный padding20px, nowrap, flex auto. Live controlled preview18249 отдаёт новый CSS. npm build прошёл, scripts/check.py ALL CHECKS PASSED с REQUIRE_TEST_DATABASE=1 и существующим .local/check-tools в PYTHONPATH. Browser sector survey1440/390 PASS, hover визуально просмотрен. Указанный в AGENTS старый browser_b10_user_flow.py не стартовал: отсутствует default каталог E:/system-of-site-sait-client-path, WinError267; его прохождение не заявлено. Иные ранее грязные изменения рабочего дерева сохранены; scoped commit включает только ширину/боковые отступы/nowrap, без присвоения других UI правок. VPS, MAXMADE reference5179 и защищённый сайт не менялись.
---
status: confirmed
category: facts
scope: system-of-site
source: Фактическая повторная сверка HEAD/рабочего дерева после параллельного коммита
evidence: git log/show HEAD0b45350 и clean status; .local/skip-hover-check-20261015.log; skip-hover-browser-20261015.log; skip-hover-legacy-browser-20261015.log; screenshots survey-skip-hover1440/390; live CSS18249
event_id: skip_question_hover_width_20261015_final
supersedes: skip_question_hover_width_20261015
---

## Уточнение UI правки 2026-10-15: min-width180px, боковые отступы20px, nowrap/flex auto для Пропустить вопрос применены в app-intake-20261012 и видны в live18249. Build PASS; общий scripts/check.py ALL CHECKS PASSED; browser sector survey1440/390 PASS, hover просмотрен. Старый browser_b10_user_flow.py не стартовал из-за отсутствия default папки E:/system-of-site-sait-client-path (WinError267). Во время работы параллельный процесс сохранил существующие изменения вместе с этой CSS правкой в0b45350, рабочее дерево clean. Наш отдельный scoped commit НЕ создавался: безопасная проверка HEAD остановила устаревшее частичное staging до записи индекса. Предыдущая запись о собственном scoped commit неточна и заменена этой. Иные изменения не откатывались; VPS/MAXMADE5179 не менялись. Preview18249/PID10924 сохранён.
---
status: confirmed
category: facts
scope: site-portfolio
source: User deployment request and observed SSH/browser results 2026-10-15
evidence: E:/MAXMADE-vps-audit-20261013/audit/vps/DEPLOYMENT-20261015.md; audit/vps/evidence/deployment-20261015.txt; audit/vps/evidence/deployed-browser-20261015.json
event_id: maxmade_deployed_20261015
---

## MAXMADE 2026-10-15 deployed approved 346-file candidate af9229502261 to VPS185.250.47.204 current symlink. Native PHP form and MySQL initialized; System of Site and AI excluded. Closed VPS preview through SSH tunnel127.0.0.1:5184 to server127.0.0.1:8080. Public domain/HTTPS pending. Browser1440/390 and static SHA checks passed; zero leads, submission and Telegram delivery from form intentionally deferred to next user step. Daily backup includes active site.
---
status: confirmed
category: facts
scope: site-portfolio
source: User request to enable public access and observed SSH and external browser results 2026-10-15
evidence: E:/MAXMADE-vps-audit-20261013/audit/vps/PUBLIC-HTTP-20261015.md; audit/vps/evidence/public-http-browser-20261015.json; audit/vps/evidence/public-http-routes-20261015.json
event_id: maxmade_public_http_20261015
---

## MAXMADE public HTTP enabled at http://185.250.47.204/ on explicit user request. Nginx and UFW port80 IPv4/IPv6 open, SSH22 preserved, MySQL loopback. Public admin endpoints403 loopback-only, private paths404, lead GET405. External browser1440/390 passed; no lead POST or new Telegram message sent. Domain unpurchased and HTTPS443 pending. Candidate and protected reference unchanged.
---
status: confirmed
category: facts
scope: systemqwen
source: .scratch/start-routing-2026-10-18/TASK.md; .scratch/start-routing-2026-10-18/RESULT.md; беседа 2026-10-18, пользователь назначил исполнителя и поручил «делай».
evidence: Локальный diff START-ROUTING-01; проверка файлов, frontmatter и ссылок; отсутствие живого прогона отмечено в RESULT.
event_id: journal_systemqwen_3f320293e3e479ececbbd01c
---

## START-ROUTING-01: действующие инструкции start/site-build/autopilot и связанные документы изменены по решению пользователя от 2026-10-18. Start ограничен рекомендацией и остановкой, запуск site-build явный, реализацию включая визуальные макеты передают отдельному исполнителю. Структура шести навыков, локальные ссылки и документальные сценарии проверены; живой прогон не проведён. Штатный quick_validate недоступен из-за отсутствующего PyYAML. Пакет awaiting-review; публикация не входит в разрешённый блок.
---
status: confirmed
category: facts
scope: site-portfolio
source: User DNS configuration confirmations and observed SSH TLS/browser results 2026-10-19
evidence: E:/MAXMADE-vps-audit-20261013/audit/vps/DOMAIN-HTTPS-20261019.md; audit/vps/evidence/domain-https-routes-20261019.json; audit/vps/evidence/domain-https-renewal-20261019.json
event_id: maxmade_domain_https_20261019
---

## MAXMADE 2026-10-19: purchased domain maxmadepro.ru at Timeweb connected to VPS185.250.47.204, apex and www A verified by Google/Cloudflare, AAAA absent after user removed hidden Timeweb record. HTTPS https://maxmadepro.ru/ enabled with Lets Encrypt ECDSA SAN apex+www expiring2027-01-17; HTTP/IP/www308 redirect canonical. External normal-DNS TLS and browser1440/390 checks passed, native lead GET405, no POST/Telegram test. Certbot renew dry-run succeeded, timer enabled active; private backups include TLS keys. Preserved preexisting active release maxmade-20261016-forumtech-zoom-26bde4e972a8 with all file SHA unchanged. Public admin stays403, loopback8080 admin via SSH remains. Protected reference, main and survey/AI unchanged.
---
status: confirmed
category: facts
scope: site-portfolio
source: User SEO-readiness question and observed public HTTPS Lighthouse/browser audit 2026-10-19
evidence: E:/MAXMADE-vps-audit-20261013/audit/vps/SEO-AUDIT-20261019.md; audit/vps/evidence/seo-20261019/lighthouse-summary.json; audit/vps/evidence/seo-20261019/http.json; audit/vps/evidence/seo-20261019/rendered.json
event_id: maxmade_seo_audit_20261019
---

## MAXMADE public-site read-only SEO audit 2026-10-19: technical SEO incomplete. robots.txt and sitemap.xml return homepage HTML200; no rel canonical; unknown route200 renders homepage. Bittly case query URL keeps homepage title/description, case buttons have no href links. Raw body empty without JavaScript; FAQPage JSON-LD exists after render, so indexing is not categorically blocked. Static JS526600B/CSS117423B delivered without gzip or explicit Cache-Control, HTML gzip works. Lighthouse13.5 single mobile run performance57/SEO92/LCP7.5s, desktop93/92/LCP1.4s. Lab data only, no field CWV/INP or Search Console/Yandex index verification. No VPS changes, lead submissions or Telegram test. Preserve active20261016 release and analyze animations only.
---
status: confirmed
category: facts
scope: site-portfolio
source: User-authorized SEO corrections with VPS SHA, public HTTP, browser, Lighthouse evidence 2026-10-19
evidence: E:/MAXMADE-seo-20261019/docs/reports/SEO-FIXES-20261019.md; E:/MAXMADE-seo-20261019/docs/reports/evidence/seo-20261019/final-summary.json
event_id: maxmade_seo_deployed_20261019
---

## MAXMADE technical SEO fixes deployed 2026-10-19 at https://maxmadepro.ru. Active release maxmade-20261019-seo-933fb77acdc0; source E:/MAXMADE-seo-20261019 branch site/seo-20261019 from f90fa5c. Working robots and sitemap53, unique canonical/title/OG, prerendered React HTML, crawlable links, real404, gzip/cache/HTTP2, deferred case chunk and cropped lossless rail previews. Original CSS/animation parameters,356 pre-SEO files except homepage and10 PHP files preserved. Build,65 public HTTP checks, browser navigation and visual comparisons320/390/1440 passed with mocked form POST, zero real leads/Telegram messages. Final Lighthouse13.5 mobile75 SEO100 FCP2.1s LCP5.3s TBT170ms CLS0, desktop100 SEO100 LCP0.5s; baseline mobile57/92/LCP7.5s desktop93/92/LCP1.4s. Lab only; mobile LCP still needs improvement, actual index/fieldCWV unknown. User confirmed Search Console and Yandex Webmaster not added. Protected5179, main, other worktrees and System of Site/brief/AI unchanged; no Git push.
---
status: confirmed
category: facts
scope: site-portfolio
source: User budget button request with screenshots and observed public browser/VPS evidence 2026-10-19
evidence: E:/MAXMADE-seo-20261019/docs/reports/BUDGET-BUTTONS-20261019.md
event_id: maxmade_budget_buttons_20261019
---

## MAXMADE 2026-10-19 budget CTA update deployed at https://maxmadepro.ru. Active release maxmade-20261019-budget-buttons-9714351b3122 supersedes SEO release933fb77acdc0. Working copy E:/MAXMADE-seo-20261019 branch site/budget-buttons-20261019 from99c4778. Lower Calculate cost button opens standard OrderModal/LeadForm. Upper Match budget opens same form with desired website cost label and question placeholder. Typed intent budget is reset on each open; budget value uses existing project field, PHP/API/Telegram unchanged. Build and browser320/390/1440 local/staged/public passed: alternating modes, cleared values, mocked submissions with attachments, success, old hero prefill. All398 prior non-generated-page files including10 PHP preserved by SHA. Backups before/after, old release retained. No real leads/Telegram messages, no main/reference5179/other worktree changes or Git push.
---
status: observation
category: facts
scope: system-of-site
source: Conversation 2026-10-13; reports/AI-LIVE-COMPLETE-20261013.md and allowlisted live evidence
evidence: Allowlisted live.json: final assembly17 current true, gaps empty; read-only browser1440/390 PASS, submissions0; three regression tests and final662 tests/lint/TS PASS.
event_id: journal_system-of-site_516d6590c5246ad227f1cd97
---

## AI-03 live synthetic conversation reached genuine assembled brief with zero required gaps and enabled confirmation on desktop/mobile. Continuation revealed reviewed-topic navigation and missing scenario field mapping; narrow fixes retain server gate and survey prompt. Aggregate17 attempts13 completed4 failures, known61527 tokens, RUB and failure usage unknown. No real submission or sends; independent review and VPS remain open.
---
status: observation
category: facts
scope: system-of-site
source: AI-MAXMADE-STYLE-20261013 report and isolated local check evidence
evidence: Isolated local tests and browser evidence, AI-MAXMADE-STYLE-20261013 report; managed model and CRM, no paid calls or real sends.
event_id: journal_system-of-site_4c389678e942913487a6879f
---

## AI-04 self-check at app d09d43f and MAXMADE c6019d9: 662 tests plus lint and TypeScript pass; managed browser390/768/1440 and previous AI/B10 desktop/mobile pass; survey baseline pixel diff0 all widths; full app bundle restored and built; published controlled launcher cold start smoke passes. Independent acceptance, physical keyboard and production integrations remain open.
---
status: observation
category: facts
scope: system-of-site
source: AI-MAXMADE-SCOPE-CORRECTION-20261013 report; controlled local tests after user correction
evidence: Controlled local self-check evidence on committed app98a3841 and site370c26c, final check native exit0 and complete bundle restore/build.
event_id: journal_system-of-site_e22de5531a9b5e65145071a9
---

## AI-04 scope correction self-check: app98a3841, MAXMADE370c26c. Site code/styles/config equal bf8c412; only two handoff documents differ. Site284 verification, both builds, browser390/768/1440 and intake/choice/survey pixel diff0 pass. Separate AI to confirmation/estimate and B10 desktop/mobile pass. Final662 tests in580.238s lint/TypeScript native exit0. Full app bundle restored/built; no paid calls or real sends. Independent review and physical keyboard/VPS/live services remain open.
---
status: confirmed
category: facts
scope: systemqwen
source: Беседа 2026-10-20, поручение пользователя «Выложи в гит наш по системе»; .scratch/start-routing-2026-10-18/RESULT.md#публикация-2026-10-20; фактические git push и ls-remote.
evidence: Проверенный merge ea05557f3e4d09aa1ce9398c348143857539ef8e; git push origin HEAD:master и git ls-remote origin refs/heads/master подтвердили одинаковый local/remote SHA; статусы сверены с TASK/HANDOFF.
event_id: journal_systemqwen_f81ce7e1939761e3d064264f
---

## 2026-10-20: по прямому поручению пользователя System2 опубликована обычным push в origin/master. Merge ea05557f3e4d09aa1ce9398c348143857539ef8e сохранил 18 локальных и 8 удалённых коммитов; полные новые записи памяти обеих сторон проверены, потерь и новых дублей нет. HEAD и живой remote совпали на этом SHA. START-ROUTING-01 остаётся awaiting-review, ROLES-04 awaiting-validation; публикация не является независимой приёмкой и не гарантирует автосохранение.
---
status: confirmed
category: facts
scope: site-portfolio
source: User file-transfer request and explicit remote-work clarification; read-only VPS and source/archive checks 2026-10-20
evidence: E:/MAXMADE-seo-20261019/docs/transfer/MAXMADE-VPS-LAPTOP-20261020.md; E:/MAXMADE-seo-20261019/docs/transfer/evidence/MAXMADE-VPS-LAPTOP-20261020.json; site documentation commit1d533d5
event_id: maxmade_vps_laptop_packet_20261020
---

## User clarified 2026-10-20: laptop is the SSH management client; MAXMADE and System of Site changes/build/deployment must happen on VPS185.250.47.204, not by replacing the public site with a laptop demo. Prepared E:/Downloads/MAXMADE-VPS-LAPTOP-20261020.zip (65555874 bytes, SHA256 521c9b778a81939c6f093c4a5805d058778b829fe28cf25f5bec4ada6141b05e) and standalone MD inside its extracted directory. Contains self-contained VPS/SSH/API/system integration guide, nonsecret metadata, public host key, SSH template,451 source files from site commit5d58c4f plus manifests; no private keys, passwords, tokens, runtime/customer data or Git history. Read-only SSH reconfirmed current budget-buttons-9714351b3122, services active, all10 PHP files match source; Node/npm/Docker absent in PATH and proposed source/system directories absent. Laptop key not enrolled, provider-independent host fingerprint verification still pending. System app locally read at fe2f5ad B08-02; current accepted laptop app/CRM state unknown, so app was not packaged. Guide documents route/CSRF/Host/cookie/iframe, PHP-vs-Python storage, proxy and CRM localhost pitfalls. No VPS or website changes, no system installation or publication.
---
status: observation
category: facts
scope: site-portfolio
source: User request and fresh repository/VPS assessment on 2026-10-20; audit commit 9e12b5f
evidence: E:/MAXMADE-system-preflight-20261020/brief-system/готовая система/docs/VPS-COMPATIBILITY-20261020.md; docs/evidence/vps-compatibility-20261020/RESULT.json; audit commit 9e12b5f; read-only VPS checkedUtc 2026-10-20T17:57:29.759957+00:00
event_id: evt_d10a795a2dc8
confidence: 1
---

## MAXMADE brief integration source is gorelovmaxon-cyber/gotovaya-sistema-brifa, main e9c4868b0f55d5e4abb4be167e67cc76007942a2, folder готовая система, pushed 2026-10-20 19:39:10 MSK. User requires current VPS website/design/SEO preserved and all application CTAs opening this system; do not add a separate button or intercept navigation. Fresh isolated checks: 963 tests in 301.739s, lint/types PASS; survey/AI browser 1440/390 through CRM/quote/approval/demo PDF PASS with no paid calls or real sends. Current VPS release remains maxmade-20261019-budget-buttons-9714351b3122, website source 5d58c4f. Packaged site is old bf8c412; never replace current website with it. Integration is not deployed: CTA context bridge, runtime/routes/storage/backup, private AI and Telegram/proxy remain. Full AI block planning and final commercial PDF are incomplete.
---
status: observation
category: facts
scope: site-portfolio
source: User authorized deployment after preflight on 2026-10-20; code commits 0e0f1a9 and 16a7cbd; report ce55386
evidence: E:/MAXMADE-system-preflight-20261020/brief-system/готовая система/docs/VPS-DEPLOYED-20261020.md and docs/evidence/vps-deployed-20261020/RESULT.json; report commit ce55386; site handoff 84bc976
event_id: evt_685a5cd0285f
confidence: 1
---

## 2026-10-20 follow-up supersedes the earlier not-deployed preflight state: the selected gotovaya-sistema-brifa/готовая система is now deployed at maxmadepro.ru. Existing website/design/cases/SEO preserved; all application CTAs open it, navigation/FAQ remain unchanged. Site current maxmade-20261020-brief-5ec8fda91785; system current /srv/maxmade-brief/releases/20261020-71ae55dbf12d. Separate maxmade-brief and maxmade-brief-telegram systemd services, SQLite/files under /var/lib/maxmade-brief; credentials outside webroot. 967 tests in 368.787s OK; public browser 22 home CTAs at 1440/390 PASS; 52 case URLs/1275 CTA launches PASS; 53 SEO URLs/canonicals, HTTPS/cookies/CSRF/Origin/ownership/operator login PASS. Separately authorized exactly one live AI opening completed and one real synthetic form notification Telegram sent:1. Daily backup and restore integrity PASS, guarded rollback stored on VPS. Old MySQL data retained without import. PDF remains demo and full AI block planning remains incomplete. Code and handoff committed locally, no GitHub push.
---
status: observation
category: facts
scope: site-portfolio
source: User requested full Git publication and laptop access handoff on 2026-10-20; Git pushes and live ls-remote verification
evidence: Live GitHub refs Sait c0f58b1515f03da84cf3f002ee5b576b09fefdeb and gotovaya-sistema-brifa b9a5bc070260960b237bdd67ccdb582f7b70e527; System docs/transfers/MAXMADE-LAPTOP-20261020.md; 5 installer checks OK; PowerShell parse PASS; outgoing Git blobs secret scan PASS
event_id: evt_d76b47e95dc3
confidence: 1
---

## MAXMADE deployment code and handoff are now published for laptop continuation: Sait branch integration/brief-vps-20261020 at c0f58b1515f03da84cf3f002ee5b576b09fefdeb; gotovaya-sistema-brifa branch integration/vps-20261020 at b9a5bc070260960b237bdd67ccdb582f7b70e527, work inside folder готовая система. Both local HEADs matched live GitHub refs after ordinary push. System2 laptop guide is docs/transfers/MAXMADE-LAPTOP-20261020.md with public known_hosts and a dedicated laptop-key registration script. Read-only SSH rechecked maxmade-admin and sudo -n, passwordauthentication no. Private bootstrap SSH key and CRM password JSON must transfer outside Git; no secret values published. Laptop key is not registered until the user runs the script on that device and confirms login. Profile unchanged; indexing remains unconfirmed.
---
status: confirmed
category: facts
scope: systemqwen
source: Беседа 2026-10-21, «сделай тогда эти все исправления» после аудита 2026-10-20; .scratch/system-checks-2026-10-21/RESULT.md; npm run test:all.
evidence: npm run test:all exit 0: memory210/210, Figma7/7, Python3/3, checker3/3; real YAML50. Первое падение изолированного runner исправлено включением extractor в копию, ожидания не ослаблялись.
event_id: journal_systemqwen_75fc99eabace498d68c70a7a
---

## CHECKS-20261021: по поручению пользователя устранены противоречия autopilot/handoff/claude-handoff/skill-forge, исправлены YAML systemqwen и ссылка qa. Добавлены воспроизводимые npm run check и test:all, локальный pinned PyYAML, Figma-тесты без рабочего env и CI workflow без публикации. Git-фикстуры не зависят от пользовательского pull/templates/PATH; transport cause сохраняется в очереди без скрытого retry. Итог: 210 memory, 7 Figma, 3 Python и 3 checker теста прошли, YAML 50 навыков валиден. Пакет awaiting-review; живые сценарии и GitHub CI awaiting-validation, push не выполнялся. Причина исходного редкого fetch failed не доказана; улучшена диагностика, HTTP408-проверка сохранена.
---
status: confirmed
category: facts
scope: system-of-site
source: User task 2026-09-27; reports/B03-RESULT.md live validation; reports/B03-EVIDENCE/LAPTOP-2026-09-27/live-results.json
evidence: Real Edge UI, CLI delivery and filtered EspoCRM GET; two snapshots revision 6/7 and two Leads; file SHA-256 preserved; sanitized records in B03-RESULT and LAPTOP-2026-09-27 evidence.
event_id: journal_system-of-site_2d2f515c3cdd2e9428a314bd
---

## B03 corrected app 2519e88 live laptop CRM validation passed: complete JSON snapshots and attachment metadata, same-revision retry without duplicate, new revision with independent Lead, CRM outage pending, recovery and two app restarts preserve source and owned file. B03 handed for independent review; B04 not started.
---
status: confirmed
category: facts
scope: system-of-site
source: User CRM task 2026-09-27; docs/site-project/reports/B04-LIVE-CRM-RESULT.md; B04-LIVE-CRM-EVIDENCE/live-results.json
evidence: Two real CRM Lead GETs match exact snapshot UTF-8; confirmation hashes recomputed; preserved file and isolated outbox across outage/restarts. Sanitized JSON and screenshots in B04-LIVE-CRM-RESULT and B04-LIVE-CRM-EVIDENCE.
event_id: journal_system-of-site_7c59df4012581b373b3694f2
---

## B04 live CRM proof on accepted aed7285 uses local test-only AI transport, not AI quality evidence. Confirmed revisions 9 and 10 delivered through normal queue to real EspoCRM exactly once each; snapshot bytes, provenance, sources, structure, turns and attachment metadata match. Edit clears confirmation and pre-confirm submit returns 409. CRM outage and two app restarts preserve old/new snapshots and file. Code unchanged; separate b04-live-crm report for planner merge, no B04 closure or B05.
---
status: observation
category: facts
scope: system-of-site
source: AI app HANDOFF and docs/AI-BRIEF-ACCEPTANCE.md, local self-check 2026-10-15
evidence: AI app tests/test_ai_manual_followup.py: 16 offline regressions OK; saved-data copy replay and managed desktop/mobile UI pass. Original failed first assembly preserved; new live quality and provider latency remain open. No paid agent calls, sends, commits or publication.
event_id: journal_system-of-site_561f63d6bdd373ea6aab0f0d
---

## AI manual followup local fixes preserve source-checked proof and explicit assembly reuse without another AI call; repeated navigation and touched-topic readiness overwrite are guarded; portfolio is grounded in current AI scope without rate changes.
---
status: confirmed
category: facts
scope: system-of-site
source: User-reported final-turn incident2026-10-19; combined application docs/RECHECK-LIVE-20261019.md final section; local diagnostic evidence and actual launcher regression39 tests
evidence: Recorded three failed attempts, one real probe on an isolated conversation copy,39 offline regressions including actual launcher and refusal accounting; no source or adequacy checks weakened.
event_id: journal_system-of-site_b3f3ccf4b3c19147074de1b8
---

## Combined live chat final-turn refusal: three terminal OneProvider responses exceeded max_tokens1200 (4020,2144,1803). One copied-dialogue request with explicit thinking disabled completed in6.751s with207 output tokens. Chat launcher now sends disabled thinking while retaining model, ceiling, completion and accounting guards. Original user conversation is preserved and no paid retry was performed on it. Single probe is not proof of provider stability or internal reasoning mode.
---
status: confirmed
category: facts
scope: system-of-site
source: Owner screenshots2026-10-20; docs/CRM-SHARED-20261019.md visual polish section; CRM polish verification receipt
evidence: Two regressions reproduced before edits, both green afterwards;956 tests in480.657s OK; same footer hit-test passes at horizontal0,350 and maximum while vertical scroll420.
event_id: journal_system-of-site_79373dbcf55c0e43d5817313
---

## CRM visual polish2026-10-20: remove footer slogan, count beside All enquiries and filter explanation; keep totals. Sticky number cells z3 previously overpainted totals z2; totals now z4 with pinned bottom-left corner z5. Only CRM TSX/CSS changed; isolated real-browser vertical/horizontal scrolling1440/390 and live read-only check passed; full956 tests passed. No backend/data changes, restart, paid AI calls, delivery or publication.
---
status: confirmed
category: facts
scope: systemqwen
source: Беседа 2026-11-01: проверить изменения GitHub и обновить System2; .scratch/system-sync-20261101/RESULT.md#update-e-20261101.
evidence: git merge --ff-only origin/master; npm run check exit 0; isolated core tests 10/10; foreign SHA256 unchanged; HEAD/live origin/master matched ca2f32a.
event_id: journal_systemqwen_c9c99e2263f086d5b85c67b4
---

## UPDATE-E-20261101: локальная System2 обновлена fast-forward с 5f631d9 до ca2f32a из origin/master, получены 20 коммитов. Проверены npm run check (69 JS, 53 YAML, 115 документов, 5 checker) и 10 целевых изолированных тестов core-index/core-journal/core-search: PASS. Чужой L06-04-FIXES сохранён без изменения. Независимая приёмка CORE-FIX/PROFILE, живые сценарии и ROLES-04 этим обновлением не подтверждены.
---
status: confirmed
category: facts
scope: systemqwen
source: Беседа 2026-11-01: пользователь не видит новые навыки в чате; .scratch/system-sync-20261101/RESULT.md#skills-discovery-20261101; https://learn.chatgpt.com/docs/build-skills.
evidence: Three local skill adapters created without overwriting existing files; quick_validate PASS 3/3; canonical targets readable. UI visibility unconfirmed.
event_id: journal_systemqwen_b820e0e54a7095f7f4464d91
---

## SKILLS-DISCOVERY-20261101: получение System2 из Git не подключает её .claude/skills к каталогу Codex. На текущем ПК добавлены три пользовательские точки входа ok, operational-cards и obrashchenie-saity, читающие канонические навыки System2. Все три прошли quick_validate, цели доступны; продуктовые навыки не изменены. Отображение в меню клиента ещё не наблюдалось; при отсутствии обновления списка требуется перезапуск клиента.
---
status: confirmed
category: facts
scope: geo-tracker
source: research/b0/00b-services.md
evidence: разбор 10 сервисов 08.11.2026
event_id: journal_geo-tracker_606b9c05c6298159d89c7315
---

## GEO B0: гипотеза «российские модели — ниша» опровергнута — GigaChat опрашивают 3 из 5 российских сервисов, DeepSeek все 5
---
status: confirmed
category: facts
scope: geo-tracker
source: коммит afdc4d6
evidence: geo/backup.py _pg_verify; ручной backup/restore 2026-11-09 вернул 59 прогонов
event_id: journal_geo-tracker_b22919f6ed782127683d7285
---

## GEO: проверка pg-копии разворачивает дамп во временную базу, поэтому роли Postgres нужно CREATEDB; install.sh его выдаёт
