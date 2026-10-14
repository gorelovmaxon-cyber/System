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
