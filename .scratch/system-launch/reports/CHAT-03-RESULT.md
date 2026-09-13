# Отчёт фазы 3 — Activepieces, bridge и flow

Status: blocked (L03-03); L03-01 и L03-02 выполнены
Date: 2026-09-13
Commit: `f17603e` (L03-01), `653d2b6` (L03-02); отчёт — коммит этой серии
Requirement IDs: R06, R07; SC-06, SC-08, SC-09, FIX-09
Source brief/task: [CHAT-03-ACTIVEPIECES.md](../CHAT-03-ACTIVEPIECES.md)

## Состояние и охват

| Участок | Итог |
|---|---|
| L03-01 — среда WSL/Docker | **pass**: Docker Desktop 4.90.0, движок 29.7.2, Compose v5.5.1 |
| L03-02 — стек, persistence, bridge из контейнера | **pass**: 4 сервиса healthy, три дефекта compose исправлены, persistence подтверждён |
| L03-03 — реальный flow, AI, ack, replay, export | **blocked**: у контейнеров нет исходящего интернета |
| Резерв конфигов | Манифест `OK` ×2; восстановление **не** проверялось |

Общий вывод: среда и стек доведены до рабочего состояния и проверены фактами.
Единственная причина остановки L03-03 — сетевая изоляция контейнеров, внешняя по
отношению к проекту. AI-ключ и его выбор на это не влияют.

## База и коммиты

- base SHA: `8c822b1fcbc77f689a68df97e76db3bebd763d5c`
- фаза 2 сохранена отдельно: `7e3efaa`
- L03: `9b58d1b` (проба, тикеты, evidence) → `8543e05` (передача после перезагрузки)
  → `c527ebf` → `f17603e` (L03-01: среда) → `653d2b6` (L03-02: стек и bridge)
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

### Три дефекта compose, найденных запуском

| # | Симптом | Причина | Правка |
|---|---|---|---|
| A | `app` unhealthy, порт недоступен | публиковалось `…:80`, приложение слушает `AP_PORT` (8642) | публикация `${AP_PORT:-8642}` с обеих сторон |
| B | healthcheck не проходил никогда | в образе нет `wget`, есть `curl` | healthcheck на `curl -fsS` |
| C | worker циклично писал `Socket.IO connection error` | при `AP_CONTAINER_TYPE=WORKER` база API берётся из `AP_FRONTEND_URL`, а там браузерный `localhost` — сам воркер | `AP_FRONTEND_URL: http://app:${AP_PORT:-8642}` **только** для `worker` |

Дефект B был скрытой причиной того, что `worker` вечно висел в `Created`
(`depends_on: app: condition: service_healthy`).

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

## L03-03 — почему `blocked`

Тикет требует реального AI-вызова из flow и настоящего export. Обе задачи упираются
в одно: **контейнеры Activepieces не имеют исходящего доступа в интернет**.

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

Проверено по четырём доменам (`kerichik.ru`, `ghcr.io`, `github.com`,
`cloud.activepieces.com`): из контейнера **каждый** резолвится в `127.204.x.x` и
соединение не устанавливается. При этом с хоста те же имена тоже резолвятся в
`127.204.x.x`, но соединение **успешно** — значит на хосте есть перехватчик,
которого нет внутри контейнера. Прокси на хосте не обнаружен: `netsh winhttp show
proxy` → `Direct access`, кандидатных портов 3128/8080/8888/1080 не слушается.

Следствия:

1. **Pieces не устанавливаются** — `piece_metadata` пуст (0 строк), реестр недостижим,
   значит flow с шагами webhook/http/code собрать нельзя.
2. **AI-вызов из flow невозможен** — воркер не дойдёт до `kerichik.ru`.

Подмена DNS ради обхода этого фильтра тикетом запрещена («обход прав … запрещены»),
поэтому обход не выполнялся.

## AI-подключение: решение и что за ним

Ключа AI в `.env` нет, connections в инстансе 0. По указанию пользователя взят
токен, которым авторизован Claude Code: `.claude/settings.json` содержит
`ANTHROPIC_BASE_URL=https://kerichik.ru`, `ANTHROPIC_AUTH_TOKEN` (значение не
печаталось) и `ANTHROPIC_MODEL=claude-sonnet-5`. Это **не** ключ `api.anthropic.com`,
а токен сторонней шлюзовой площадки.

Шлюз проверен живым вызовом с хоста: `POST https://kerichik.ru/v1/messages` с моделью
`claude-sonnet-5` → `200`, ответ содержит блок `text: "ok"`; работают оба варианта
авторизации (`Authorization: Bearer` и `x-api-key`). То есть шлюз работоспособен.

Из этого следуют два отклонения, которые должен подтвердить планировщик:

1. Шаг `analyze` придётся делать **generic HTTP-запросом**, а не официальным piece
   Claude (тот ходит на `api.anthropic.com` и base URL не переопределяет). Это отход
   от [blueprint](../../../services/activepieces/flows/memory-event-to-writer.json).
2. Содержимое событий памяти будет уходить на сторонний домен.

Оба решения приняты пользователем осознанно; исполнитель их не выбирал сам.

## Настоящий export

**Не получен**, но контракт закреплённой версии установлен фактами, а не догадкой.
В web-бандле `0.86.3` (`/usr/src/app/dist/packages/web/assets`) экспорт — это
`downloadFlow` → `Fi.getTemplate(id)`, то есть серверный маршрут
`GET /api/v1/flows/:id/template`. Проверено на живом инстансе:

```
GET /api/v1/flows/EVDV9FqfzueiB7WBnYyWW/template -> 200
ключи: name, type, summary, description, tags, blogUrl, metadata, author,
       categories, pieces, flows, status        (type=SHARED)
```

Отдельного `/import` в серверном API `0.86.3` нет — импорт собирается на клиенте
(`importFlowsFromTemplates` → `POST /api/v1/flows` с `templateId`). Поэтому пункт
приёмки «проверен на импорт» требует отдельного решения о способе, а не команды.

`services/activepieces/flows/memory-event-to-writer.json` остаётся **blueprint** с
заглушками и за настоящий export не выдаётся.

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
| R06/R07 / SC-09, FIX-09 — flow → writer | Не выполнялось: нет интернета в контейнерах | логи `pieces/sync` | **blocked** |
| Секреты не в Git | `.env` gitignored, значения не выводились | `git check-ignore`, diff | pass |

## Ограничения и незакрытые проверки

Не выполнено и требует решения по среде: установка pieces из реестра, реальный
AI-вызов из flow, sync ack с тем же `event_id`, повторная доставка, негативный
сценарий SC-09 с недоступным bridge и настоящий export с проверкой импорта.

Пункт L03-02 «worker реально способен исполнять flow» закрыт подключением к API,
готовностью sandbox и отсутствием ошибок в логах, но **не** наблюдением успешного
прогона: flow с триггером не создавался.

## Затраты

| Метрика | Значение | Источник |
|---|---:|---|
| wall-clock time | `unknown` | не замерялось таймером |
| retries/repeats | 3 прогона стека, 2 перезапуска Docker Desktop, 1 вызов шлюза | вывод команд |
| context/input tokens | `unknown` | метрика недоступна |
| output tokens | `unknown` | метрика недоступна |
| monetary cost | 1 минимальный вызов шлюза (`max_tokens=32`) | probe |

## Вывод проверяющего

- [x] Задание и Requirement IDs проверены
- [x] Положительные и негативные сценарии выполнены; остальные ограничены названной причиной
- [x] Diff и изменённые файлы просмотрены; L02, L03 и PROC-02 разделены коммитами
- [x] Секретов и необоснованных утверждений нет; host-smoke не выдан за контейнерный
- [ ] **Статус: `blocked` на L03-03.** Следующее действие — решение о среде:
      (а) разрешить контейнерам исходящий доступ (или назвать поддерживаемый прокси),
      либо (б) согласовать иной способ доставки события, не требующий интернета из
      контейнера. Параллельно — подтверждение планировщиком двух отклонений:
      generic HTTP вместо piece Claude и передача содержимого памяти на сторонний шлюз.
