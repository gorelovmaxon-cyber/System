# Отчёт фазы 3 — Activepieces, bridge и flow

Status: blocked
Date: 2026-09-13
Commit: `9b58d1b` (серия L03; отчёт — коммит этой серии)
Requirement IDs: R06, R07; SC-06, SC-08, SC-09, FIX-09
Source brief/task: [CHAT-03-ACTIVEPIECES.md](../CHAT-03-ACTIVEPIECES.md)

## Состояние и охват

Фаза 3 **не завершена**: Activepieces не запускался. Независимая подготовка,
доступная без Docker, выполнена полностью, дефект самой пробы исправлен, и
получен живой host-smoke через bridge. Всё, что требует контейнеров, owner,
AI-connection, sync ack и export, остаётся невыполненным и не выдаётся за успех.

| Участок | Итог |
|---|---|
| Проба фазы 3 | Дефект исправлен; живой прогон пройден, exit 0 |
| Host bridge smoke | Подтверждён: health, отказ авторизации, идемпотентный повтор |
| Резерв конфигов | Манифест проверен (`OK` ×2); восстановление **не** проверялось |
| WSL / Docker | **Не работают**; административный шаг не выполнен |
| Activepieces / worker / БД | Не запускались |
| Flow, AI, ack, replay в AP, export | Не выполнялись |

## База и коммиты

- base SHA: `8c822b1fcbc77f689a68df97e76db3bebd763d5c` (= `origin/master` на момент старта; локальный HEAD был `acf841d`)
- фаза 2 сохранена отдельно: `7e3efaa` — до публикации L03, без приписывания авторства проверки GPT
- реализация L03: `9b58d1b` — исправленная проба, evidence, тикеты L03-01…L03-03, правка `docs/activepieces-setup.md`

## Файлы изменения

Серия L03 (`9b58d1b`):

- [.scratch/system-launch/evidence/activepieces-phase3-preflight.cjs](../evidence/activepieces-phase3-preflight.cjs) — исправленная проба
- [.scratch/system-launch/evidence/activepieces-phase3-preflight-2026-09-13.json](../evidence/activepieces-phase3-preflight-2026-09-13.json) — **неуспешное** evidence, сохранено как есть
- [.scratch/system-launch/evidence/activepieces-phase3-preflight-host-smoke-2026-09-13.json](../evidence/activepieces-phase3-preflight-host-smoke-2026-09-13.json) — успешный прогон
- [.scratch/system-launch/issues/L03-01-activepieces-environment.md](../issues/L03-01-activepieces-environment.md), [L03-02](../issues/L03-02-activepieces-stack-and-bridge.md), [L03-03](../issues/L03-03-flow-to-writer.md)
- [docs/activepieces-setup.md](../../../docs/activepieces-setup.md) — актуальный рабочий путь вместо устаревшего `E:\System2`; точная точка остановки среды
- [.scratch/system-launch/CHAT-03-ACTIVEPIECES.md](../CHAT-03-ACTIVEPIECES.md) — уточнённое задание фазы

Серия L02 (`7e3efaa`): `services/khoj/run-local.py`, `services/khoj/test_run_local.py`,
`services/khoj/README.md`, `docs/khoj-setup.md`, `reports/CHAT-02-RESULT.md`,
`issues/L02-02`, `issues/L02-03`, `evidence/khoj-phase2-live-review*`, `HANDOFF.md`.

## Исправление пробы

Предыдущее evidence имело `checks:{}` и ошибку hash: проба останавливалась
**до любого POST**, поэтому авторизация `/write` и replay не проверялись.

Причина сверена по коду: проба хэшировала `JSON.stringify({event_id, proposals})`,
а [writer.js](../../../scripts/memory/writer.js) в `proposalHash` — `JSON.stringify({eventId, proposals})`.
Проверено вычислением: ключ `eventId` даёт `e8b0fef…fb8c9e` (совпадает с журналом),
ключ `event_id` — `706e503…3b821f` (значение из ошибки).

Исправлено **в пробе**: HTTP-поле запроса осталось `event_id`, контракт writer не
менялся, `proposalHash` не экспортируется и не вызывался. Проверка совпадения с
persisted-событием сохранена **до** POST; assert не отключался, память и журналы
ради зелёного теста не менялись.

Дополнительно: обязательный `--output` с отказом перезаписи существующего файла,
таймауты внешних команд (15 с) и HTTP (15 с), честный exit code. Факты среды
(WSL, Docker, registry) записываются отдельно и **не** входят в assert смоука.

Проверка отказа перезаписи:

```
$ node .scratch/system-launch/evidence/activepieces-phase3-preflight.cjs
usage: node activepieces-phase3-preflight.cjs --output <new-file.json>      # exit 2
$ node … --output .scratch/system-launch/evidence/activepieces-phase3-preflight-2026-09-13.json
refusing to overwrite existing evidence: …activepieces-phase3-preflight-2026-09-13.json   # exit 2
```

## Проверки и сценарии

Живой прогон (рабочий каталог `D:\SystemTheBest\System`), exit **0**:

```
node .scratch/system-launch/evidence/activepieces-phase3-preflight.cjs \
  --output .scratch/system-launch/evidence/activepieces-phase3-preflight-host-smoke-2026-09-13.json
```

- **Положительный:** `GET /health` → `200 {"status":"ready","writer":true}`;
  `POST /write` с токеном для известного события → `200
  {"status":"persisted","written_files":[".claude/memory/facts/writer-entries.md"],
  "revision":"0a471effda65","idempotent":true}`.
- **Негативный (авторизация):** `POST /write` без токена → `401 {"error":"unauthorized"}`,
  записи нет. Это проверка границы bridge; полный негативный сценарий SC-09
  (bridge недоступен из контейнера) требует стека и остаётся `blocked`.
- **Инвариант:** `config_memory_journals_unchanged: true` — SHA-256
  `config/system.local.json`, `services/activepieces/.env`,
  `.claude/memory/facts/writer-entries.md`, `.local/writer/processed.jsonl`,
  `.local/indexer/tasks.jsonl` до и после POST совпали. Повтор не создал дубля.
- **Регрессия фазы 2:** `<venv>\Scripts\python.exe services/khoj/test_run_local.py`
  → `Ran 3 tests … OK`, exit 0.

Состояние процессов проверено отдельно, без запуска второго экземпляра:
bridge — PID 6256 (node), слушает `127.0.0.1:8643`; Khoj — PID 11332 (python),
слушает `127.0.0.1:42110`. PID сам по себе доступность не доказывает; health
bridge подтверждён HTTP-ответом выше.

Манифест резерва:

```
$ tr -d '\r' < MANIFEST.sha256 > /tmp/m.sha256 && sha256sum -c /tmp/m.sha256
activepieces.env: OK
system.local.json: OK
```

Манифест хранится с CRLF, поэтому `sha256sum -c` по исходному файлу даёт
`No such file or directory`; сверка выполнена после нормализации переводов строк.

## Версии

| Компонент | Значение | Источник |
|---|---|---|
| Khoj | `1.42.10` | фаза 2, `pip show khoj` |
| Node (bridge) | работает, PID 6256 | `netstat`, HTTP `/health` |
| Activepieces (закреплено) | `0.86.3` | [docker-compose.yml](../../../services/activepieces/docker-compose.yml) |
| Образ AP | `ghcr.io/activepieces/activepieces:0.86.3`, digest `sha256:208517c4f0d798a477a0c594bf432dd0f4918433f4b6f5b5f188a6e10e638c6c`, платформы linux/amd64 и linux/arm64 | registry lookup манифеста 2026-09-13, HTTP 200 |
| Docker | **отсутствует** | `docker --version` → ENOENT |
| WSL | **не работает** | `wsl --status` → `Wsl/WSL_E_WSL_OPTIONAL_COMPONENT_REQUIRED` |
| ОС | Windows 10 Home Single Language `10.0.19045`, сессия без прав администратора | `Get-Service`, вывод WSL |

Образ подтверждён **только как манифест в registry**. Pull, распаковка и запуск
не выполнялись; digest — наблюдение на дату, а не гарантия.

## Матрица требований (затронутые строки)

| Требование/критерий | Реализованное поведение | Evidence | Результат |
|---|---|---|---|
| R06 / SC-06 — сервис запущен | Не запущен: нет WSL/Docker | `environment.wsl`, `environment.docker` в evidence | **blocked** |
| R06/R07 / SC-08 — защищённый bridge | Health, отказ без токена, идемпотентный повтор | `checks.*` в host-smoke JSON | pass (host); container→bridge — **blocked** |
| R06/R07 / SC-09, FIX-09 — flow → writer | Не выполнялось | — | **blocked** |
| SC-06 — container→host зафиксирован | Не проверялось: нет контейнера | — | **blocked** |
| Секреты не в Git | `.env` gitignored, значения не выводились и не коммитились | `git check-ignore`, diff серии | pass |

## Настоящий export

**Не получен.** Экспорт flow из живого Activepieces невозможен без стека.
`services/activepieces/flows/memory-event-to-writer.json` остаётся **blueprint**
с заглушками webhook/connection и своей ролью; за настоящий export не выдаётся.

## Резерв и пути (без секретов)

- Резерв конфигов: `D:\SystemTheBest\transfer-backups\pre-activepieces-20260913-105607\`
  (`activepieces.env`, `system.local.json`, `MANIFEST.sha256`).
- Логи bridge: `.local/services/bridge-phase3.stdout.log`, `bridge-phase3.stderr.log`.
- Логи проверки фазы 2: `D:\SystemTheBest\runtime\khoj-review-2026-09-13.stderr.log`,
  `D:\SystemTheBest\runtime\khoj-data\pgserver\log`.

Резерв содержит **два конфига** и не является полным backup runtime/базы;
проверка восстановления не выполнялась.

## Ограничения и незакрытые проверки

Не выполнено и требует рабочего Docker: `docker info`/Compose, pull и запуск
pinned-образа, `app`+`worker`+Postgres+Redis, owner, persistence после `restart`,
достижимость bridge **из контейнера**, реальный AI-вызов, sync ack с тем же
`event_id`, повторная доставка в AP, негативный сценарий SC-09 и настоящий export.

Автоматических действий с правами администратора и перезагрузки не выполнялось.
Актуальные требования Docker Desktop к этой версии Windows не подтверждались
официальным источником в этом проходе — это часть L03-01 до установки.

## Затраты

| Метрика | Значение | Источник |
|---|---:|---|
| wall-clock time | `unknown` | не замерялось таймером |
| retries/repeats | 1 успешный живой прогон пробы + 2 проверки отказа | вывод команд |
| context/input tokens | `unknown` | метрика недоступна в этом окружении |
| output tokens | `unknown` | метрика недоступна в этом окружении |
| monetary cost | `unknown` | внешние платные вызовы не выполнялись |

AI-провайдер не вызывался; платных вызовов не было.

## Вывод проверяющего

- [x] Исходное задание и Requirement IDs проверены
- [x] Положительный и негативный сценарии выполнены; остальные явно ограничены причиной
- [x] Зависимости и изменённые файлы просмотрены; L02 и L03 разделены коммитами
- [x] Секретов и необоснованных утверждений нет; host-smoke не выдан за контейнерный
- [ ] **Статус: `blocked`.** Следующее действие: пользователь выполняет
      `wsl --install --no-distribution` в PowerShell от администратора (перезагрузка —
      только если потребует установщик), затем исполнитель проверяет результат и
      продолжает с L03-01. Один шаг, без повторной просьбы вслепую.
