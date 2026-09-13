# Отчёт фазы 3 — Activepieces, bridge и flow

Status: awaiting-review (L03-01…L03-03 выполнены; L03-03 — на границе блока)
Date: 2026-09-13
Commit: `f17603e` (L03-01), `653d2b6` (L03-02); отчёт — коммит этой серии
Requirement IDs: R06, R07; SC-06, SC-08, SC-09, FIX-09
Source brief/task: [CHAT-03-ACTIVEPIECES.md](../CHAT-03-ACTIVEPIECES.md)

## Состояние и охват

| Участок | Итог |
|---|---|
| L03-01 — среда WSL/Docker | **pass**: Docker Desktop 4.90.0, движок 29.7.2, Compose v5.5.1 |
| L03-02 — стек, persistence, bridge из контейнера | **pass**: 4 сервиса healthy, четыре дефекта compose исправлены, persistence подтверждён |
| L03-03 — реальный flow, AI, ack, replay, export | **pass**: реальный AI-вызов, persisted, коррелированный ack, негативные сценарии, настоящий export с проверенным импортом |
| Резерв конфигов | Манифест `OK` ×2; восстановление **не** проверялось |

Общий вывод: среда, стек и полный цикл «событие → AI → writer → ack» доведены до
рабочего состояния и проверены фактами. Оба прежних блокера (неразрешимость имён в
контейнерах и вопрос о AI-шлюзе) сняты 2026-09-13; ни один пункт тикета L03-03 не
сокращён.

## База и коммиты

- base SHA: `8c822b1fcbc77f689a68df97e76db3bebd763d5c`
- фаза 2 сохранена отдельно: `7e3efaa`
- L03: `9b58d1b` (проба, тикеты, evidence) → `8543e05` (передача после перезагрузки)
  → `c527ebf` → `f17603e` (L03-01: среда) → `653d2b6` (L03-02: стек и bridge)
  → `a02d949` (отчёт и передача по фактам) → `d4880ac` (уточнение причины: egress
  есть, имена в контейнере неразрешимы) → коммит этой серии (L03-03: реальный flow,
  AI, ack, replay, export с проверенным импортом)
- `07c12c3` (PROC-02) — работа другого чата, не трогалась

## L03-01 — среда

Docker Desktop `4.90.0 (238679)` установлен официальным установщиком, движок отвечает:
`docker info` → `ServerVersion=29.7.2`, `OSType=linux`, `Driver=overlayfs`, 8 CPU.
Требования сверены официальным источником с датой; evidence —
[l03-01-environment-2026-09-13.json](../evidence/l03-01-environment-2026-09-13.json).

**Расхождение с документацией:** Windows 10 **Home** Single Language отсутствует в
формальном списке поддерживаемых редакций Docker Desktop. Движок на ней работает
(источник допускает Linux-контейнеры для Home), но это факт наблюдения, а не гарантия.

## L03-02 — стек, bridge, persistence

Проверено реальным запуском. `docker compose ps`: `app`, `worker`, `postgres`, `redis`
— все `Up (healthy)`; `/api/v1/health` → `{"status":"Healthy"}`; worker подключён к API
по Socket.IO. Доказательства — [l03-02-stack-and-bridge-2026-09-13.json](../evidence/l03-02-stack-and-bridge-2026-09-13.json).

Образы подтверждены реальным pull, digest совпал с прежним registry-lookup:

| Образ | Digest |
|---|---|
| `ghcr.io/activepieces/activepieces:0.86.3` | `sha256:208517c4f0d798a477a0c594bf432dd0f4918433f4b6f5b5f188a6e10e638c6c` |
| `pgvector/pgvector:0.8.0-pg14` | `sha256:c55d7e7deac05dde62139e0ded4fcf4f58363656cbc382dbea82fbed995aa767` |
| `redis:7.0.7` | `sha256:bb474c35022ca2c5618f4c49ca759bd2c0eea1daf5d934c560bd30092b97b498` |

### Четыре дефекта compose, найденных запуском

| # | Симптом | Причина | Правка |
|---|---|---|---|
| A | `app` unhealthy, порт недоступен | публиковалось `…:80`, приложение слушает `AP_PORT` (8642) | публикация `${AP_PORT:-8642}` с обеих сторон |
| B | healthcheck не проходил никогда | в образе нет `wget`, есть `curl` | healthcheck на `curl -fsS` |
| C | worker циклично писал `Socket.IO connection error` | при `AP_CONTAINER_TYPE=WORKER` база API берётся из `AP_FRONTEND_URL`, а там браузерный `localhost` — сам воркер | `AP_FRONTEND_URL: http://app:${AP_PORT:-8642}` **только** для `worker` |
| D | любой прогон flow падал до старта: `Failed to fetch piece bundle @activepieces/piece-webhook@0.1.41: 404 Not Found` | `app` отдаёт воркеру **свой** `AP_FRONTEND_URL` как `PUBLIC_URL` (`machine-service` → `domainHelper.getPublicUrl`), а в `.env` там браузерный `localhost`; воркер обращался к `http://localhost:8642` — к **своему** health-серверу, где маршрута нет | `AP_FRONTEND_URL: http://app:${AP_PORT:-8642}` также для `app` |

Дефект B был скрытой причиной того, что `worker` вечно висел в `Created`
(`depends_on: app: condition: service_healthy`).

Дефект D найден только прогоном: снаружи его не видно. Диагностика шла от фактов,
а не от догадки — отсутствие запроса в логах `app` при `404` у воркера показало, что
воркер обращается не к `app`. Прямая проба из воркера к `app:8642` давала `403`
(маршрут есть, токена нет) — то есть маршрут и реестр pieces были исправны, а ложный
`404` порождал неверную цель запроса. Реестр при этом непустой:
`piece_metadata` = 12 118 строк, обе закреплённые версии на месте, `platformId` у
официальных pieces пуст, `minimumSupportedRelease=0.82.0`, `maximumSupportedRelease`
покрывает `0.86.3` — то есть фильтры `filterRegistry` их не отсекают.

### Граница bridge из контейнера

`host.docker.internal` из контейнера разрешается в `192.168.65.254` и достигает host
loopback, поэтому `scripts/memory/bridge-server.js` **не менялся** — bind остался
`127.0.0.1:8643`, необходимости открывать bridge шире не возникло.

- положительно: `GET $AP_HOST_BRIDGE_URL/health` из контейнера `worker` → `200 {"status":"ready","writer":true}`
- отрицательно: `/write` без токена и с неверным токеном → `401 {"error":"unauthorized"}`
- инвариант: SHA-256 трёх файлов памяти/журналов до и после обоих отказов совпал
  (`25720bc491d839a57c55c144f94d9e8e908b992f4fcf60ef2e76005dc258c6b7`) — записи нет

### Persistence

После `docker compose restart` owner `owner@system2.local` (ADMIN/ACTIVE) входит,
платформа `O0PRL568R2GmDPfYWsSDY`, проект `b14PZIo3ppZG7S7Z79eyX`, flow
`EVDV9FqfzueiB7WBnYyWW` читается с совпадающим `projectId` → `PERSISTENCE CONFIRMED`.

Owner, платформа и flow создавались через API, а не в UI; учётные данные — в
`.local/services/activepieces-owner.txt` (gitignored), в отчёт и коммит не попадают.
Одноразово в терминал попал JWT сессии (loopback, срок до 2026-09-20); в файлы и
коммиты он не записан.

## Сетевой блокер: разбор и снятие

Разбор сохранён как история диагноза: он объясняет, почему правки хоста не помогали
контейнерам и почему «нет интернета» было неверной формулировкой.

Формулировка уточнена 2026-09-13 по прямому указанию пользователя: первоначальное
«у контейнеров нет исходящего доступа в интернет» **неверно** — egress есть.

Факты:

```
$ docker compose exec app sh -lc 'getent hosts cloud.activepieces.com'
127.204.0.77    cloud.activepieces.com
$ docker compose exec app sh -lc 'curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/'
000
$ docker compose logs app | grep sync
ERROR POST /api/v1/pieces/sync 200 — TypeError: fetch failed
      cause={"code":"ECONNREFUSED","address":"127.204.0.77","port":443}
```

Дополнительно проверено, что egress по литеральному IP **работает**:
`curl https://1.1.1.1/` из контейнера → `301` за 0.3 с, `https://8.8.8.8/` → `302`.
Ломается только разрешение имён.

Механизм установлен командами:

1. **Роутер `192.168.31.1` (прошивка XiaoQiang) отвечает на DNS синтетическими
   адресами** — `127.204.0.x` для A и `fd00:696e:6974:6578::/64` (в hex читается
   «initex») для AAAA, свой для каждого имени: `cloud.activepieces.com` →
   `127.204.0.77`, `github.com` → `127.204.0.156`, `api.anthropic.com` →
   `127.204.0.4`, `kerichik.ru` → `127.204.0.6`, `ghcr.io` → `127.204.0.32`,
   `registry.npmjs.org` → `127.204.0.153`. Подтверждено `Resolve-DnsName -Server
   192.168.31.1` и `nslookup`: отвечает именно роутер, а не провайдер.
2. **На Windows-хосте эти loopback-адреса перехватывает `Proxifier`**
   (`D:\Proxifier`, профиль `%APPDATA%\Proxifier4\Profiles\Default.ppx`): правило
   «localhost — напрямую, всё остальное — через прокси», резолвинг `ViaProxy`,
   апстрим — HTTPS-прокси `188.64.162.3:4302`. Подтверждено: соединение к
   `127.204.0.6:443` переписывается в loopback-пару, серверную сторону держит
   процесс `Proxifier.exe`. Тем же объясняется, почему на хосте имена «работают».
3. **Контейнеры вне перехвата.** Внутри контейнера `127.204.x.x` — его собственный
   loopback, поэтому соединение получает `ECONNREFUSED`. Резолвер контейнера —
   `127.0.0.11` (Docker), внешний сервер `192.168.65.7`, то есть та же цепочка до
   роутера.

Следствия:

1. **Pieces не устанавливаются** — `piece_metadata` пуст (0 строк), реестр недостижим,
   значит flow с шагами webhook/http/code собрать нельзя.
2. **AI-вызов из flow невозможен** — воркер не дойдёт до `kerichik.ru`.

Проверенные пути решения и почему отклонены:

- **Прописать прокси в Docker Desktop — не работает.** Апстрим `188.64.162.3:4302`
  из контейнера **недостижим**: `curl -x https://188.64.162.3:4302 …` →
  `Connection refused` (порт 443 того же адреса — тоже `000`), тогда как
  `1.1.1.1:443` → `301`, `8.8.8.8:443` → `302`.
- **Подмена DNS контейнера на публичный резолвер** дала бы настоящие адреса в обход
  настроенного канала — это обход, тикетом запрещён, не выполнялась.

**Снято 2026-09-13.** Пользователь отключил `Proxifier` и поднял полнотуннельный ВПН
(адаптер `happ-tun`, маршрут по умолчанию) — ровно тот канал, который был назван
недостающим. Проверено фактами, а не предположением:

- из контейнера `worker`: `https://kerichik.ru/` → `200`, `https://api.anthropic.com/v1/messages`
  → `405` (настоящий API, не подстановка);
- `https://registry.npmjs.org/@activepieces/piece-webhook/-/piece-webhook-0.1.41.tgz`
  → `200` (29 638 байт), `…/piece-http-0.11.19.tgz` → `200` (208 091 байт);
- `piece_metadata` = 12 118 строк; `@activepieces/piece-webhook@0.1.41` и
  `@activepieces/piece-http@0.11.19` присутствуют.

Критерий готовности среды из прежней формулировки выполнен: имя резолвится в
маршрутизируемый адрес, соединение до AI-хоста устанавливается.

## L03-03 — реальный flow, AI, ack, replay, export

Собран **настоящий** flow в живом Activepieces `0.86.3`, не копия blueprint:
`W4PcZIAb…` → после пересборки действующий `4aPXiCJNifVuLYnqdhF0T` (ENABLED,
publishedVersionId `A7CQZJuD2lLeIoFINa7nU`). Структура:
`catch_webhook → prepare_prompt (CODE) → analyze (HTTP) → validate (CODE) → route`,
ветки `persist` / `no-pattern` / `fallback`, в `persist` — `write (HTTP)` и
`return_persisted`, в `no-pattern` — `return_no_pattern`, в `fallback` — `return_failed`.

Сборка велась через API инстанса (`POST /api/v1/flows/:id` операциями
`UPDATE_TRIGGER`, `ADD_ACTION`, `ADD_BRANCH`, `LOCK_AND_PUBLISH`), потому что формы
шагов и op-схемы сняты из кода образа, а не угаданы. Все операции вернули `200`,
каждый шаг — `valid=true`.

### Два gotcha, найденных прогоном

1. **Ссылка на триггер тоже требует `['output']`.** Записи вида
   `{{trigger['body'].event_id}}` в input сохраняются как есть и на исполнении дают
   **пустую строку** — рерайтер `expression-rewriter` правит только исходники CODE, а
   не шаблоны `{{…}}` в input, и каноническая форма для 0.20-схемы — `{{trigger['output']['body'].event_id}}`.
   Первый прогон вернул `500 … event_id:""` именно из-за этого.
2. **Ответ шлюза начинается блоком `thinking`.** В `content` первым идёт блок с
   `thinking`, а не `text`, поэтому разбор `content[0].text` давал пустую строку и
   `AI response contains no JSON object`. Валидатор собирает текст из **всех** блоков
   с полем `text`; `max_tokens` поднят до 2048.

### Прогоны (все — реальные, на изолированной fixture)

| # | Сценарий | Результат | Память fixture |
|---|---|---|---|
| 1 | `has_pattern=true`, draft | `200`, `{event_id, status:"persisted"}`, 3 proposals | +3 записи (SHA изменился) |
| 2 | `has_pattern=false`, draft | `200`, `{event_id, status:"no-pattern"}` | **байт-в-байт не изменилась** (writer не вызван) |
| 3 | повтор того же `event_id` | `409 CONFLICT` от writer, run `FAILED` на шаге `write` | без изменений, дубля нет |
| 4 | bridge остановлен | run `FAILED`: `ECONNREFUSED 192.168.65.254:8644` | без изменений, ложного `persisted` нет |
| 5 | bridge с чужим токеном | run `FAILED`: `401 unauthorized` | без изменений, ложного `persisted` нет |
| 6 | восстановление, тот же event | `200`, `persisted` (revision `cfe9d078f0f2`) | событие пригодно для повтора |
| 7 | идемпотентность: те же proposals | `200 {status:"persisted", idempotent:true}` | новых записей нет |
| 8 | опубликованная версия (`/sync`) | `200`, `persisted`, тот же `event_id` | +3 записи |

Сценарии 4 и 5 дают вызывающему `HTTP 408` с пустым телом, а не `5xx`: упавший run не
порождает flow-response, поэтому синхронный webhook доходит до `WEBHOOK_TIMEOUT_SECONDS=30`.
Это не ложное подтверждение — контракт подтверждает доставку только по
`{event_id,status:"persisted"}` либо `{event_id,status:"no-pattern"}`, — но означает
30-секундное ожидание на каждый отказ. Оставлено как есть: `continueOnFailure` на шаге
`write` вернул бы `return_persisted` на ошибке и дал бы **ложный** ack.

Память проверялась дважды: `.claude/memory` (основная) — `git status` чист, SHA файлов
совпал; вся запись шла в `.local/services/l03-03-fixture`, fixture названа fixture.
Реальный bridge на `:8643` (PID 21224) и конфиги не перегенерировались и не трогались.

## AI-подключение: решение и что за ним

Ключа AI в `.env` нет, connections в инстансе 0. По указанию пользователя взят
токен, которым авторизован Claude Code: `.claude/settings.json` содержит
`ANTHROPIC_BASE_URL=https://kerichik.ru`, `ANTHROPIC_AUTH_TOKEN` (значение не
печаталось) и `ANTHROPIC_MODEL=claude-sonnet-5`. Это **не** ключ `api.anthropic.com`,
а токен сторонней шлюзовой площадки.

Шлюз проверен живым вызовом с хоста: `POST https://kerichik.ru/v1/messages` с моделью
`claude-sonnet-5` → `200`, ответ содержит блок `text: "ok"`; работают оба варианта
авторизации (`Authorization: Bearer` и `x-api-key`). То есть шлюз работоспособен.

Шлюз идентифицирован без авторизации: `kerichik.ru` — «Kerichik AI Hub», сервис
выдаёт API-ключ, Base URL и инструкции для Claude Code, Cursor и других клиентов;
сертификат Let's Encrypt, `CN=kerichik.ru`.

Два вопроса, поднятых исполнителем, закрыты 2026-09-13 прямыми указаниями
пользователя:

1. **Отправка данных памяти на `kerichik.ru` разрешена.** В шаг `analyze` по
   [blueprint](../../../services/activepieces/flows/memory-event-to-writer.json)
   уходят `event_id`, `project_id`, `kind`, `summary`, `decisions`,
   `user_corrections`, `checks`, `next_action` и `diff` (до 20 000 байт) — решения
   по проекту, правки пользователя и диффы файлов. Разрешение касается **только**
   этого шлюза; иной посредник потребует нового согласования.
2. **Generic HTTP вместо официального piece — допустим** при сохранении контракта:
   `analyze` делается HTTP-запросом к `kerichik.ru`, ответ обязан проходить
   `validate` и держать схему `{has_pattern, proposals}`.

Полный цикл AI → writer → коррелированный ответ и повторная доставка остаются
обязательными; объём тикета не сокращён. Токен шлюза не печатался и не коммитился.

## Настоящий export и проверка импорта

Экспорт **получен** и очищен. Контракт закреплённой версии установлен фактами:
в web-бандле `0.86.3` экспорт — это `downloadFlow` → `Fi.getTemplate(id)`, то есть
`GET /api/v1/flows/:id/template`. Сырой ответ лежит вне Git
(`.local/services/l03-03-export-raw.json`), очищенный — в репозитории:
[memory-event-to-writer.export.json](../../../services/activepieces/flows/memory-event-to-writer.export.json)
(`type=SHARED`, 15 257 байт, `pieces: [piece-webhook, piece-http]`).

Очистка: поля `token` в `authFields` шагов `analyze` и `write` заменены на
`REPLACE_WITH_LOCAL_TOKEN`; проверено, что значения токена шлюза и токена bridge в
тексте экспорта **отсутствуют** (`secret values still present: 0`).

Импорт в закреплённой версии проверен **не** по догадке. Отдельного `/import` в
серверном API нет, и `POST /api/v1/flows` с `templateId` содержимое **не** переносит —
он лишь сохраняет ссылку и создаёт пустую версию (`flowService.create`), что и
подтвердил первый, ошибочный заход: импортированный flow оказался с триггером `EMPTY`.
Реальный путь версии — серверная валидация шаблона плюс клиентская операция
`IMPORT_FLOW`:

```
POST /api/v1/templates                  -> 201 (валидация IMPORT_FLOW пройдена)
POST /api/v1/flows                      -> 201 (пустой flow)
POST /api/v1/flows/:id  IMPORT_FLOW     -> 200, valid=true
сравнение структуры экспорт vs импорт   -> identical (trigger…route, все settings.input)
```

`services/activepieces/flows/memory-event-to-writer.json` остаётся **blueprint** с
заглушками и за настоящий export не выдаётся; это разные файлы с разными ролями.

## Версии

| Компонент | Значение | Источник |
|---|---|---|
| Activepieces | `0.86.3` | закреплённый [docker-compose.yml](../../../services/activepieces/docker-compose.yml) |
| Docker / Compose | `29.7.2` / `v5.5.1` | `docker --version`, `docker compose version` |
| Docker Desktop | `4.90.0 (238679)` | `docker info`, установщик |
| WSL | `2.7.14.0`, kernel `6.18.33.2-2` | `wsl.exe --version` |
| Khoj | `1.42.10` | фаза 2 |
| ОС | Windows 10 Home Single Language `10.0.19045` | `Get-ComputerInfo` |

## Секреты

`git check-ignore -v` подтверждает: `services/activepieces/.env`, `config/system.local.json`,
`.local/` игнорируются. Значения AP/JWT/encryption/Postgres и токен bridge не
перегенерировались, не печатались и не коммитились. Токен шлюза читается скриптами
из `settings.json` во время выполнения и в файлы проекта не записывается.

Проверки записи выполнялись на контролируемых событиях; основная память после них не
изменилась (SHA-256 совпал).

## Диск

Публикация и запуск стека утяжелили C:. Замеры: свободно C: `13.3 ГБ` до установки →
`10.2` после Docker Desktop → `7.9` после pull → `3.37` в минимуме → `16.52` после
остановки и перезапуска. Диск Docker Desktop лежит на C: по умолчанию:
`%LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx` ≈ `4.3 ГБ`; `docker system df`
показывает 0 B под очистку (все образы в работе).

Перенос на D: через `settings-store.json` (`"DataFolder": "D:\\DockerData"`) **не
сработал**: Docker нормализовал ключ и принял его, но данные остались на C:, целевой
каталог пуст. Перенос выполняется только через GUI (Settings → Resources → Advanced →
Disk image location) — это шаг пользователя. Перед экспериментом сделаны резервные
копии трёх volumes в `D:\SystemTheBest\transfer-backups\docker-volumes-20260913\`
(≈8.9 МБ); целостность стека после двух перезапусков подтверждена.

## Матрица требований (затронутые строки)

| Требование/критерий | Реализованное поведение | Evidence | Результат |
|---|---|---|---|
| R06 / SC-06 — сервис запущен | 4 сервиса healthy, health 200, UI доступен | `stack_after_fixes` | pass |
| R06/R07 / SC-08 — защищённый bridge | Health, отказ без токена и с неверным, инвариант записи | `container_to_bridge` | pass |
| SC-06 — container→host зафиксирован | `host.docker.internal` → `192.168.65.254` | `container_to_bridge.dns` | pass |
| Persistence после restart | owner, платформа, flow сохранены | `persistence_restart` | pass |
| R06/R07 / SC-09, FIX-09 — flow → writer | Реальный AI-вызов, валидация, persisted, коррелированный ack, replay, негативные сценарии | прогоны 1–8 в разделе L03-03 | pass |
| R06/R07 / SC-09 — export и импорт | Настоящий export очищен; импорт через `IMPORT_FLOW` даёт `valid=true` и совпадение структуры | раздел «Настоящий export» | pass |
| AI-шлюз для шага `analyze` | `kerichik.ru` разрешён пользователем 2026-09-13; живой `200` из flow | решение в тикете L03-03 | pass |
| Секреты не в Git | `.env` gitignored, значения не выводились; в экспорте токенов нет | `git check-ignore`, diff, очистка экспорта | pass |

## Ограничения и незакрытые проверки

Не выполнялись и не входят в объём: общая приёмка ядра, работа чата 4
(Git → очередь → AP → writer → Khoj → Git), перенос, релиз и skill-forge.
`khoj` в fixture намеренно выключен, поэтому индекс памяти (`indexed`) не проверялся —
различать `persisted`, `synced` и `indexed` обязательно, и здесь подтверждён только
`persisted`.

Наблюдаемое ограничение поведения платформы: упавший run не порождает flow-response,
поэтому отрицательная доставка стоит вызывающему 30 с (`WEBHOOK_TIMEOUT_SECONDS`).
Ложного подтверждения при этом нет. Если потребуется коррелированный отказ, это
отдельная правка flow (ветка по результату `write`) и отдельное решение.

Пункт L03-02 «worker реал��но способен исполнять flow» теперь закрыт наблюдением:
прогоны 1–8 — это реальные run-записи в `flow_run`, а не логи шага.

Остаточное состояние локального инстанса: проверка импорта оставила в нём две
записи `type=SHARED` (`xrbsm9LlAXesUOhEpBPab`, `gJ701NtXbnM5vwjWHegVa`) — созданные
ею же flow удалены (`204`), а сами шаблоны удалить нельзя: `DELETE /api/v1/templates/:id`
в 0.86.3 намеренно отказывает для `OFFICIAL` и `SHARED` (`AUTHORIZATION`, `403`),
а `update` не принимает `type`. Обходить это правкой строк в БД не стал: это обход
штатной защиты, а не устранение причины. Факт записан в README рядом с инструкцией
по импорту.

## Затраты

| Метрика | Значение | Источник |
|---|---:|---|
| wall-clock time | `unknown` | не замерялось таймером |
| retries/repeats | 5 сборок flow, 12 прогонов flow (8 зачётных + 4 отладочных), 2 неудачных захода на импорт, 3 удаления flow/шаблонов | вывод команд |
| context/input tokens | `unknown` | метрика недоступна |
| output tokens | `unknown` | метрика недоступна |
| monetary cost | вызовы шлюза в прогонах 1–8 (`max_tokens=2048`) | `flow_run` |

## Вывод проверяющего

- [x] Задание и Requirement IDs проверены
- [x] Положительные и негативные сценарии выполнены; остальные ограничены названной причиной
- [x] Diff и изменённые файлы просмотрены; L02, L03 и PROC-02 разделены коммитами
- [x] Секретов и необоснованных утверждений нет; host-smoke не выдан за контейнерный
- [ ] **Статус: `awaiting-review`.** L03-01…L03-03 выполнены и проверены фактами;
      L03-03 — на границе блока, `done` ставит приёмщик после проверки diff и прогонов.
      Общая приёмка ядра не начиналась. Открытые ограничения названы выше: `indexed`
      не проверялся (khoj в fixture выключен), упавший run стоит вызывающему 30 с и не
      даёт коррелированного отказа; и то, и другое — вне объёма блока.
