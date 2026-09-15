# L06-02 — Bootstrap, привязка и round-trip на втором ПК

**What to build:** На втором ПК выполнить bootstrap, локальную привязку, запуск нужных сервисов и клиента, hooks и поиск известной записи. Проверить согласованный сценарий возврата изменения через Git и конфликта без force и без потери обеих версий.
**Requirement IDs:** SC-12, SC-13; R09, R13.
**Blocked by:** L06-01.
**Status:** **awaiting-review** — шаги 4–8 выполнены 2026-09-15 на самом втором ПК (`DESKTOP-NCLRFDV`, `E:\SystemTheBest\System`): bootstrap и локальная привязка, bridge и Khoj, поиск известной записи, restore, обмен изменениями через `origin` с разрешением конфликта, `sync.js --status`. Результаты и границы — в [отчёте фазы 6](../reports/CHAT-06-RESULT.md), раздел «Второй ПК». **Четыре пункта выполнены не полностью и `done` не объявляются:** hooks намеренно не включены (получатель событий не готов — Activepieces ещё не запущен), участие настоящего первого ПК в обмене не проверено, `local_paths` трёх проектов остаются заглушками (корни на этой машине не подтверждены), WSL 2.7.14 и Docker Desktop 4.91.0 уже установлены, но Windows ожидает ручную перезагрузку и Docker Engine пока недоступен. Дополнено 2026-09-15: [состояние WSL2/Docker до и после установки](../evidence/l06-02-wsl-docker-readiness-second-pc-2026-09-15.json), [локальные привязки](../evidence/l06-02-local-bindings-second-pc-2026-09-15.json), [задание ноутбуку](../CHAT-06-LAPTOP-TASK.md). `done` ставит приёмщик. Ниже сохранён исходный пакет команд.
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

Каждый пункт с указанием, **чем** подтверждён. Где подтверждения нет — пункт не отмечен.

- [x] bootstrap на втором ПК проходит, doctor даёт `OK` по переносимым пунктам и понятные
      `PROBLEM` по сервисам — `OK` по одиннадцати проверкам (git, remote, branch, node,
      resolve-paths, конфиг, project `HANDOFF.md`, shared memory root, Khoj, bridge,
      состояние очереди), `PROBLEM` по трём сервисам и по `hooksPath`.
      Evidence: [doctor --json](../evidence/l06-02-doctor-second-pc-2026-09-15.json).
- [ ] `hooksPath` = `.git-hooks-templates` — **отложено намеренно**, получатель событий не
      готов (Activepieces без Docker). Обратное проверено измеримо: `queue-status.js` после
      всех коммитов и push этой сессии показывает **0** событий, тогда как на первом ПК то же
      действие дало бы по одному `failed` на коммит.
- [x] Локальная привязка заполнена: `system_root` = `E:\SystemTheBest\System`,
      `khoj.enabled` и `bridge.enabled` = `true`, токен bridge сгенерирован на этой машине
      (значение в Git и в отчёт не переносится). **Исключение — `local_paths` трёх
      проектов:** их корни на этой машине не подтверждены, заглушки оставлены осознанно,
      автоподстановка по совпадению темы запрещена.
      Evidence: [local bindings](../evidence/l06-02-local-bindings-second-pc-2026-09-15.json).
- [x] `project_id` определяется правильно там, где это проверимо: корень системы →
      `systemqwen` (`exit 0`); вне корня — честный отказ
      `project_id cannot be determined` (`exit 1`), а не подставленное значение.
- [x] Нужные сервисы запущены; health bridge и Khoj отвечают так же, как на первом ПК:
      bridge `{"status":"ready","writer":true}` и `401` без токена и с неверным токеном;
      Khoj `{"email": "default@example.com"}`; `GET /api/update` → `{"status":"ok"}`;
      источник индекса — только `.claude/memory/**/*.md`.
- [x] Поиск находит известную запись с `source`, `scope` и `status_hint`; отрицательный
      запрос возвращает `{"ok":true,"results":[]}`, а не случайные top-N; `project_id` вне
      реестра отклоняется до HTTP (`unknown-project`).
- [ ] Возврат изменения через Git проходит **в обе стороны** — механика подтверждена через
      настоящий `origin` (push, приём, встречная правка, конфликт в одной строке, ручное
      разрешение с сохранением **обеих** правок, merge-commit `a1692e9` с двумя родителями;
      force/`reset --hard`/`clean -f` не применялись — проверено по `reflog`). **Но
      встречной стороной был временный клон на этой же машине**, а не настоящий ноутбук.
      Закрывается заданием [CHAT-06-LAPTOP-TASK.md](../CHAT-06-LAPTOP-TASK.md), которое
      ноутбук должен выполнить и опубликовать.
- [x] `.local/` остаётся локальным; одна каноническая копия памяти на машину:
      `sync.js --status` → ahead `0`, behind `0`, `clean true`; журналы `.local/` читаются по
      последней записи на идентификатор, `corrupt_count 0`, `quarantine: null`; временный
      клон-пир после проверки удалён.

`done` не выставлен: два пункта не подтверждены, и по заданию `done` ставит приёмщик.
Заполнение `local_paths` и включение hooks зависят от действий вне этого тикета (Docker/WSL2
и подтверждение путей пользователем).

## Ограничения

- Сценарии выполнены на настоящем втором ПК; изолированный клон на первом ПК этим drill не
  считается и повторно не прогонялся.
- WSL 2.7.14 и Docker Desktop 4.91.0 на втором ПК уже установлены, но до ручной
  перезагрузки WSL2 не запускается, Docker Engine недоступен и шаг с Activepieces не
  выполнен; hooks отложены. Точное состояние до и после установки —
  [evidence](../evidence/l06-02-wsl-docker-readiness-second-pc-2026-09-15.json).
- Участие ноутбука в обмене не проверено — это задание
  [CHAT-06-LAPTOP-TASK.md](../CHAT-06-LAPTOP-TASK.md), а не работа, выполняемая здесь.
- Секреты второго ПК созданы на машине и в Git не попадают.

## Как закончить

1. Результат — в [отчёте фазы 6](../reports/CHAT-06-RESULT.md), раздел «Второй ПК».
2. Тикет в `awaiting-review`. Чтобы закрыть два оставшихся пункта, нужны: ручная
   перезагрузка, запуск Docker Desktop/Activepieces и ответ ноутбука по заданию обмена.
   До этого `done` не выставляется.
