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
