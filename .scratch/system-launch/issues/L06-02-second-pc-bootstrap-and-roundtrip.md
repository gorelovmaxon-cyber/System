# L06-02 — Bootstrap, привязка и round-trip на втором ПК

**What to build:** На втором ПК выполнить bootstrap, локальную привязку, запуск нужных сервисов и клиента, hooks и поиск известной записи. Проверить согласованный сценарий возврата изменения через Git и конфликта без force и без потери обеих версий.
**Requirement IDs:** SC-12, SC-13; R09, R13.
**Blocked by:** L06-01.
**Status:** **blocked** — второй ПК недоступен (см. [L06-01](L06-01-second-pc-access-and-transfer-package.md)); сценарии могут быть выполнены только на нём. Пакет команд ниже — не выполнение тикета.
**Перед началом работы:** Сначала L06-01: состояние и сохранение данных второго ПК. Не запускать bootstrap до сохранения.

## Контекст

Bootstrap идемпотентен и по умолчанию ничего не запускает: сервисы и перестройку индекса
включают только явные флаги `--start-services` и `--rebuild-index`. Doctor возвращает код
1, пока сервисы не подняты, — это ожидаемо и не означает неудачный bootstrap.

Изолированный клон на этом ПК проверялся в фазах 2–5 и повторно не прогоняется: тот же
прогон не доказывает, что механика работает на другом устройстве, а задание прямо
запрещает объявлять drill выполненным по локальному клону.

## Пакет команд для второго ПК

### Шаг 4 — bootstrap и локальная привязка

```powershell
Set-Location <КОРЕНЬ_ВТОРОГО_ПК>
node scripts/memory/bootstrap.js --root <КОРЕНЬ_ВТОРОГО_ПК>
node scripts/memory/doctor.js    --root <КОРЕНЬ_ВТОРОГО_ПК> --json
```

Что делает bootstrap: создаёт ignored `config/system.local.json`
(`init-local-config.js`), ставит переносимые hooks (`bash .git-hooks-templates/install-hooks.sh`)
и сразу запускает doctor. **Ничего не удаляет и не перезаписывает чужой код.**

Ожидаемый результат doctor: `OK` для git/remote/branch, node, resolve-paths,
`config/system.local.json`, `project HANDOFF.md`, `portable hooksPath`
(должен быть ровно `.git-hooks-templates`), `shared memory root`; `PROBLEM` для Khoj,
bridge и Activepieces — до их запуска. Код выхода 1 на этом шаге нормален.

Затем вручную: заполнить в `config/system.local.json` локальные пути и проверить
`project_id`; создать секреты по README сервисов (не через Git).

### Шаг 5 — сервисы и клиент

```powershell
# порядок: bridge → Khoj → Activepieces, каждый по своему README
node scripts/memory/bridge-server.js          # ожидается health {"status":"ready","writer":true}
curl.exe -s http://127.0.0.1:8643/health
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:42110/api/health   # ожидается 200
docker compose -f services/activepieces/docker-compose.yml up -d
```

Khoj настраивается **только** на `<КОРЕНЬ_ВТОРОГО_ПК>/.claude/memory`; индекс
перестраивается локально из памяти и не переносится:

```powershell
node scripts/memory/indexer.js --run
node scripts/memory/indexer.js --status
```

Ожидаемое: `indexer.js --status` не показывает `failed` у нужных задач; после `--run`
индекс наполнен. При ошибках — `--requeue-failed`.

### Шаг 6 — поиск известной записи

```powershell
node scripts/memory/search.js --query "push без нового вопроса в согласованных границах" --project systemqwen
```

Ожидаемое: `ok:true`, источник — `decisions/writer-entries.md` или
`facts/github-remote.md`, у каждой находки есть `scope` и `status_hint`. Отдельного поля
даты у поиска нет — дата читается в теле записи. Пустая выдача, `ok:false` или ответ из
локального fallback означают, что Khoj или индекс не готовы.

### Шаг 7 — возврат изменения через Git и конфликт

```powershell
# на втором ПК: изменение, коммит, публикация в согласованных границах
git status --short; git add <файлы>; git commit -m "<кратко>"
git push origin master

# на этом ПК: принять изменение
git fetch origin; git log --oneline --left-right HEAD...origin/master
git pull --ff-only origin master

# и обратно: изменение с этого ПК → на втором ПК тем же порядком
```

Конфликт проверяется на одном и том же файле в двух копиях:

```powershell
# в обеих копиях правим одну строку в одном файле и коммитим
git pull --no-rebase origin master     # в той копии, что отстала
git status --short
```

Ожидаемое: слияние **без force**; при конфликте в файле видны обе версии, разрешение
явное, обе правки сохраняются, создаётся обычный merge-commit. `reset --hard`, `clean -f`
и force push не применяются ни на одном шаге.

### Шаг 8 — границы локального состояния

```powershell
node scripts/memory/sync.js --status
```

Правила, которые проверяются этим шагом: `.claude/memory` — одна каноническая копия на
машину, синхронизируется через Git; `.local/` (очередь, writer/indexer-логи, bridge pid)
— локальное состояние машины, из Git не приходит и в общую папку не выкладывается;
локальный lock остаётся локальным и не превращается в сетевую блокировку общей папки.

## Критерии приёмки

- [ ] bootstrap на втором ПК проходит, doctor показывает `OK` по переносимым пунктам и понятные `PROBLEM` по сервисам.
- [ ] Локальная привязка заполнена, `project_id` верный, hooksPath = `.git-hooks-templates`.
- [ ] Нужные сервисы и клиент запущены; health bridge и Khoj отвечают так же, как на этом ПК.
- [ ] Поиск находит известную запись с `source`, `scope` и `status_hint`.
- [ ] Возврат изменения через Git проходит в обе стороны; конфликт сохраняет обе версии без force.
- [ ] `.local/` остаётся локальным; одна каноническая копия памяти на машину.

Все пункты ожидают выполнения на втором ПК. Ни один не отмечен выполненным.

## Ограничения

- Сценарии требуют реального второго ПК: без него тикет остаётся `blocked`, а не `done`.
- Изолированный клон на этом ПК был бы повторением проверок фаз 2–5 и не считается этим drill.
- Секреты второго ПК создаются вручную и в Git не попадают.

## Как закончить

1. Результат — в [отчёте фазы 6](../reports/CHAT-06-RESULT.md).
2. До выполнения на втором ПК статус остаётся `blocked`.
